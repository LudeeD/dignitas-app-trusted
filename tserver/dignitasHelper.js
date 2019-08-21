const cbor = require('cbor')

const request = require('request')
const {createHash} = require('crypto')
const {protobuf} = require('sawtooth-sdk')
const {createContext, CryptoFactory} = require('sawtooth-sdk/signing')

const secp256k1 = require('sawtooth-sdk/signing/secp256k1')

const PRIVATE_KEY='7829579579681bdcb95fbd631caf3eccfe2eccec0e6bf27f76f6aa3882aefa32'
const context = createContext('secp256k1');
const privateKey = secp256k1.Secp256k1PrivateKey.fromHex(PRIVATE_KEY)
const signer = new CryptoFactory(context).newSigner(privateKey)

const API_URL = "http://localhost:8008/batches"

const calculateVoteAddress = (vote_id) =>{
    let zVec = new Array(50).fill(0).join('')
    let address = ['ce9618', '01',vote_id, zVec].join('')
    return [address]
}

const calculateWalletAddress = (voter) =>{
    console.log(voter)
    let hash = createHash('sha512').update(voter).digest('hex').slice(0, 62)
    console.log(hash)
    let address = ['ce9618', '00',hash].join('')
    return [address]
}

const createRewardTxn = (rewards) =>{
    let txns = []

    rewards.forEach( (value, user) => {
        user = user[0]
        let payload = {
            action: 'reward',
            voter: user,
            value: JSON.stringify(value),
        }

        console.log(payload)

        let payloadBytes = cbor.encode(payload)

        let address = calculateWalletAddress(user)

        let transactionHeaderBytes = protobuf.TransactionHeader.encode({
            familyName: 'dignitas',
            familyVersion: '1.0',
            inputs:   address,
            outputs:  address,
            signerPublicKey: signer.getPublicKey().asHex(),
            batcherPublicKey: signer.getPublicKey().asHex(),
            dependencies : [],
            payloadSha512: createHash('sha512').update(payloadBytes).digest('hex')
        }).finish()
        let signature = signer.sign(transactionHeaderBytes)

        let transaction = protobuf.Transaction.create({
            header: transactionHeaderBytes,
            headerSignature: signature,
            payload: payloadBytes,
        })

        txns.push(transaction)
    })

    return txns;
}

const createCloseTxn = (vote_id) =>{

    let payload = {
        action : 'close',
        vote_id: vote_id,
    }

    let payloadBytes = cbor.encode(payload)

    let address = calculateVoteAddress(vote_id)

    let transactionHeaderBytes = protobuf.TransactionHeader.encode({
        familyName: 'dignitas',
        familyVersion: '1.0',
        inputs:   address,
        outputs:  address,
        signerPublicKey: signer.getPublicKey().asHex(),
        batcherPublicKey: signer.getPublicKey().asHex(),
        dependencies : [],
        payloadSha512: createHash('sha512').update(payloadBytes).digest('hex')
    }).finish()

    let signature = signer.sign(transactionHeaderBytes)

    let transaction = protobuf.Transaction.create({
        header: transactionHeaderBytes,
        headerSignature: signature,
        payload: payloadBytes,
    })

    return transaction

}

const methods = {
    updateKeyKey : () =>{
        let privKey = context.newRandomPrivateKey()
        console.log(privKey)
        privateKey = privKey
    },

    close: async  (vote_id, rewards) => {

        let closeTxn = createCloseTxn(vote_id)

        let rewardTxns = createRewardTxn(rewards)

        let transactions = [closeTxn].concat(rewardTxns)

        let batchHeaderBytes = protobuf.BatchHeader.encode({
            signerPublicKey: signer.getPublicKey().asHex(),
            transactionIds: transactions.map((txn) => txn.headerSignature),
        }).finish()

        signature = signer.sign(batchHeaderBytes)

        let batchClose = protobuf.Batch.create({
            header: batchHeaderBytes,
            headerSignature: signature,
            transactions: transactions
        })

        let batchListBytes = protobuf.BatchList.encode({
            batches: [batchClose,]
        }).finish()

        request.post({
            url: API_URL,
            body: batchListBytes,
            headers: {'Content-Type': 'application/octet-stream'}
        }, (err, response) => {
            if (err) return console.log(err)
            console.log(response.body)
        })
    }
}

module.exports = methods
