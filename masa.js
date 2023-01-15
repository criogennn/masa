const Web3 = require("web3");
const { BigNumber } = require('ethers');
const fs = require('fs')
const readline = require("readline")
const axios = require('axios');

const rpcURL = '' // Нода гоерли
const web3 = new Web3(rpcURL)

const faucetKey = '' //ключ аккаунта с которого раскидываете эфир
const faucetAddress = '' // адрес аккаунта с которого раскидываете эфир
const masaCookie = '' // куки масы

let privateKeys = []
let addresses = []

const masaAddress = '0x4454d3892124Ad4d859770660495461D1C5a37F3'
const masaABI = [{"inputs":[{"internalType":"address","name":"paymentMethod","type":"address"},{"internalType":"string","name":"name","type":"string"},{"internalType":"uint256","name":"yearsPeriod","type":"uint256"},{"internalType":"string","name":"_tokenURI","type":"string"}],"name":"purchaseIdentityAndName","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"payable","type":"function"}]
const masaContract = new web3.eth.Contract(masaABI, masaAddress)

const mainURL = 'https://beta.middleware.masa.finance/storage/store'
const headers = {
    headers: {
        'authority': 'beta.middleware.masa.finance',
        'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'cookie': masaCookie, //куки от масы
        'origin': 'https://beta.claimyoursoul.masa.finance',
        'referer': 'https://beta.claimyoursoul.masa.finance/',
        'sec-ch-ua': '"Not_A Brand";v="99", "Google Chrome";v="109", "Chromium";v="109"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
    }
}

async function sleep(seconds){
    return new Promise((resolve) =>{setTimeout(resolve, 1000 * seconds)})
}

async function getURI(name, address){
    const res = await axios.post(mainURL, {'soulName': `${name}`, 'receiver': web3.utils.toChecksumAddress(address), 'duration': '1'}, headers)
    return res.data.metadataTransaction.id
}

function huy(){
    function randomInteger(min, max) {
        let rand = min - 0.5 + Math.random() * (max - min + 1);
        return Math.round(rand);
    }

    function ret(){
        alph = 'qwertyuiopasdfghjklzxcvbnm'
        return alph[randomInteger(1, alph.length - 1)]
    }

    return ret() + ret() + ret() + ret() +ret()
}

async function buildTx(address){
    const name = huy()
    const id = await getURI(name, address)

    const data = masaContract.methods.purchaseIdentityAndName('0x0000000000000000000000000000000000000000', name, 1, `ar://${id}`).encodeABI()
    let tx = {
        to: masaAddress,
        value: web3.utils.toWei('0.000000005214561451', 'ether'),
        gas: 700000,
        gasPrice: web3.utils.toWei("70", 'gwei'),
        data: data
    }

    return tx
}



async function generateAccounts(quantity){
    for(let i = 0; i < quantity; i++){
        const account = web3.eth.accounts.create()
        console.log(i)
        fs.appendFile('masaAcc.txt', `${account.address} ${account.privateKey}\n`, function(err){if(err) throw err})
    }
}

async function setAccounts(){
    const rl = readline.createInterface({ 
        input:fs.createReadStream('masaAcc.txt'), 
    })
    for await (let line of rl) {
        addresses.push(line.split(' ')[0])
        privateKeys.push(line.split(' ')[1])
    }
}

async function singleCall(tx, privateKey){
    let signedTx = await web3.eth.accounts.signTransaction(tx, privateKey)
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
    .once('transactionHash', (hash) => {
      console.log(hash)
    })
    .catch(e =>{
      console.log(e.message)
    })
}

async function disperse(){
    let nonce = await web3.eth.getTransactionCount(faucetAddress) // адрес аккаунта откуда разбрасывать эфир
    for(i of addresses){
        let tx = {
            to: i,
            nonce: nonce,
            value: web3.utils.toWei('0.05', 'ether'), // количество эфира на аккаунт
            gas: 22000,
            gasPrice: web3.utils.toWei("80", 'gwei'),
        }
        nonce +=1
        singleCall(tx, faucetKey)
    }
}

async function main(){
    // generateAccounts(5) // генерирует аккаунты(колво писать в скобках) и записывает их в файл
    await setAccounts()
    console.log(addresses)
    console.log(privateKeys)

    //await disperse() // раскидывает эфир на все аккаунты из файла

    for(i of privateKeys){
        let account = web3.eth.accounts.privateKeyToAccount(i)
        let tx = await buildTx(account.address)
        singleCall(tx, i)
    } // закоментируете весь цикл for когда используете disperse так как транзы на получения эфира не успеют пройти

}

main()