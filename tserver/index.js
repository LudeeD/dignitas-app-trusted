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
    ClientEventsSubscribeResponse 
} = require('sawtooth-sdk/protobuf')

const VALIDATOR_URL = "tcp://localhost:4004"
const NULL_BLOCK_ID = '1cc2278441d74fd8020d256cb8925c83bdd1ee442d44a66455c14f569eea1e1828a31101688f1eedae9659d4e59d64ab4a9538c0d45b31cab8aabcdfb8cb848e'
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

const closeVote = async ( id, veredict ) => {
    let positive_votes = await db.retrieve_positive(id)
    let negative_votes = await db.retrieve_negative(id)
    console.log(positive_votes)
    console.log(negative_votes)
}

const start = () => {
    //dig.updateKey()
    dig.closeVote('6fc3f26baa46')


    return new Promise(resolve => {
        stream.connect(() => {
            stream.onReceive(handleEvent)
            subscribe().then(resolve)
        })
    })
}


app.get('/:veredict/:id', function(req, res){
    let vote_id = req.params.id;
    let veredict = req.params.veredict;

    closeVote(vote_id, veredict)

    res.send({status: 'sent'})
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
