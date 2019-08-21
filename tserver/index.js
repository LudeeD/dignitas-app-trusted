'use strict'
const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const _ = require('lodash')
const cbor = require('cbor');
const { Stream } = require('sawtooth-sdk/messaging/stream')

const db = require('./dbhandler')

const dig = require('./dignitasHelper')

const {
    Message,
    EventList,
    EventSubscription,
    EventFilter,
    StateChangeList,
    ClientEventsSubscribeRequest,
    ClientEventsSubscribeResponse,
    ClientBatchSubmitRequest,
    ClientBatchSubmitResponse
} = require('sawtooth-sdk/protobuf')

const VALIDATOR_URL = "tcp://localhost:4004"
const NULL_BLOCK_ID = 'be49547492e56beba2252615779ec1a9027840345e134e736987289696328dfa0d980e130f9827ce5d1e9d52b470387607cc242529bd5f1e1bf7abed9aa41a26'
const stream = new Stream(VALIDATOR_URL)

const subscribe = () => {

    const deltaSub = EventSubscription.create({
        eventType: 'sawtooth/state-delta',
        filters: [EventFilter.create({
            key: 'address',
            matchString: 'ce961801.*',
            filterType: EventFilter.FilterType.REGEX_ANY
        })]
    })

    const new_vote = EventSubscription.create({
        eventType: 'dignitas/create'
    })

    return stream.send(
        Message.MessageType.CLIENT_EVENTS_SUBSCRIBE_REQUEST,

        ClientEventsSubscribeRequest.encode({
            lastKnownBlockIds: [NULL_BLOCK_ID],
            subscriptions: [deltaSub, new_vote]
        }).finish()
    )
        .then(response => ClientEventsSubscribeResponse.decode(response))
        .then(decoded => {
            const status = _.findKey(ClientEventsSubscribeResponse.Status,
                val => val === decoded.status)
            if (status !== 'OK') {
                throw new Error(`Validator responded with status "${status}"`)
            }
        })
}

const persistVotes = (e) => {
    let vote = {
        id: e.attributes[0].value,
        voter: e.attributes[1].value,
        value: e.attributes[2].value
    }
    db.insert(vote)
}

const handleEvent = msg => {
    console.log("Message Received")
    if (msg.messageType === Message.MessageType.CLIENT_EVENTS) {
        const events = EventList.decode(msg.content).events

        events.forEach( e => {
            if( e.eventType == 'dignitas/create'){
                persistVotes(e)
            }
            if( e.eventType == 'sawtooth/state-delta'){
              sendToSocket(getChanges(e))
            }
        }
        )

    } else {
        console.warn('Received message of unknown type:', msg.messageType)
    }
}

const getChanges = event => {
    if (!event) return []

    const changeList = StateChangeList.decode(event.data)

    // Filter State Changes On Vote Addresses Onlu
    return changeList.stateChanges
        .filter(change => change.address.slice(0, 8) === 'ce961801')
}

const sendToSocket = (changes) => {
    changes.forEach( change => io.emit("response", cbor.decodeFirstSync(change.value)))
}



const start = () => {
    //dig.updateKey()
    db.initialize()

    return new Promise(resolve => {
        stream.connect(() => {
            stream.onReceive(handleEvent)
            subscribe().then(resolve)
        })
    })
}

const closeVote = async ( id, veredict ) => {
    let positive_votes = await db.retrieve_positive(id)
    console.log(positive_votes)
    let negative_votes = await db.retrieve_negative(id)
    console.log(negative_votes)
    negative_votes.forEach( x => x.value = Math.abs(x.value))
    console.log(negative_votes)

    let pot_true  = 0;
    positive_votes.forEach( x => pot_true = pot_true + x.value )
    let pot_false = 0;
    negative_votes.forEach( x => pot_false = pot_false + x.value )
    let rewards = new Map()

    if( veredict == 'true' ){
      pot_false = pot_false * 1.1;
      positive_votes.forEach( x => rewards.set([x.voter], Math.round(x.value + (pot_false*(x.value/pot_true)))))
    }else{
      pot_true = pot_true * 1.1;
      negative_votes.forEach( x => rewards.set([x.voter], Math.round(x.value + (pot_true*(x.value/pot_false)))))
    }

    dig.close(id, rewards)
}


app.get('/close/:id/:veredict', function(req, res){
    let vote_id = req.params.id;
    let veredict = req.params.veredict;

    closeVote(vote_id, veredict)

    res.send({ "status": "closing" })
});

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

io.on('connection', function(socket){
    console.log('a user connected');
    socket.on('disconnect', function() {
        console.log('user disconnected');
    });
});

http.listen(1337, function(){
    console.log('listening on *: 1337');
});

start().then("nice");
