'use strict'

const _ = require('lodash')
const cbor = require('cbor');
const { Stream } = require('sawtooth-sdk/messaging/stream')

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
const NULL_BLOCK_ID = '4c62f9dd32778f0f4a6b595e6ef04ee5b19828c6d755a83997d73bd3b9f66e8d34c72bb132ca82d3a7628d8fc1767a5b8f5dd9faae184fff565abbbf62d206ce'
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

    return stream.send(
        Message.MessageType.CLIENT_EVENTS_SUBSCRIBE_REQUEST,

        ClientEventsSubscribeRequest.encode({
            lastKnownBlockIds: [NULL_BLOCK_ID],
            subscriptions: [deltaSub]
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

const getChanges = events => {
    const event = events.find(e => e.eventType === 'sawtooth/state-delta')
    if (!event) return []

    const changeList = StateChangeList.decode(event.data)
    return changeList.stateChanges
        .filter(change => change.address.slice(0, 8) === 'ce961801')
}

const handleEvent = msg => {
    console.log("Message Received")
    if (msg.messageType === Message.MessageType.CLIENT_EVENTS) {
        const events = EventList.decode(msg.content).events
        console.log(events)
        const changes = getChanges(events)
        handle(getChanges(events))
    } else {
        console.warn('Received message of unknown type:', msg.messageType)
    }
}

const deltaQueue = {
    _queue: [],
    _running: false,

    add (promisedFn) {
        this._queue.push(promisedFn)
        this._runUntilEmpty()
    },

    _runUntilEmpty () {
        if (this._running) return
        this._running = true
        this._runNext()
    },

    _runNext () {
        if (this._queue.length === 0) {
            this._running = false
        } else {
            const current = this._queue.shift()
            return current().then(() => this._runNext())
        }
    }
}

const handle = (changes) => {
    console.log(changes)
    changes.forEach( change => console.log(cbor.decodeFirstSync(change.value)))
    //deltaQueue.add(() => {
    //    return Promise.all(otherChanges.map(entryAdder(block)))
    //        .then(() => {
    //            // If there are page changes, give other changes a chance to propagate
    //            const wait = pageChanges.length === 0 ? 0 : 100
    //            return new Promise(resolve => setTimeout(resolve, wait))
    //        })
    //        .then(() =>  Promise.all(pageChanges.map(entryAdder(block))))
    //        .then(() => blocks.insert(block))
    //})
}

const start = () => {
    return new Promise(resolve => {
        stream.connect(() => {
            stream.onReceive(handleEvent)
            subscribe().then(resolve)
        })
    })
}

export default start;
