import { useState, useMemo } from 'react';
import { createInstance } from 'react-async';
import { Button, AppBar, Box, Toolbar, Typography, TextField} from '@mui/material';
import { Connection, Transaction, clusterApiUrl, PublicKey } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import BN from "bn.js"
import provider from './lib/AnchorProvider';
import anchorProgram from './lib/program';
import { donationId, ownerId } from './lib/pubKey'
import donor from './accounts/donor.json' // huita
import Wallet from '@project-serum/sol-wallet-adapter';
import styles from './styles'


function App() {
  anchor.setProvider(provider)

  const network = clusterApiUrl('devnet');
  const providerUrl = 'https://www.sollet.io';
  const connection = useMemo(() => new Connection(network), [network]);
  const wallet = useMemo(() => new Wallet(providerUrl, network),[providerUrl, network]);
  
  const [connected, setConnected] = useState(false);
  const [donationAmount, setDonationAmount] = useState<string>('');
  const [owner, setOwner] = useState<PublicKey>(PublicKey.default);

  const isOwner = () => owner.toString() === ownerId.toString();

  wallet.on('connect', () => {
      setConnected(true);
      if (wallet.publicKey?.toString() === ownerId.toString())
          setOwner(ownerId);
      console.log('Connected:' + wallet.publicKey?.toBase58());
  });

  wallet.on('disconnect', () => {
      setConnected(false);
      setOwner(PublicKey.default);
      console.log('Disconnected');
  });
  
  const getBalance = async() => {
      let balance : number = 0;
      if (wallet.publicKey){
          balance = await connection.getBalance(wallet.publicKey);
          return (balance / 1000000000).toFixed(3);
      }
  }
  const AsyncBalance = createInstance({promiseFn:getBalance},'AsyncBalance');

  const sendLamports = async(from: PublicKey, to: PublicKey , amount: number) => {
    console.log('Im here')
    let transaction = new Transaction();
    console.log('Next 1')
    transaction.feePayer = from;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash

    if (!isOwner()) {
      console.log('ne owner', amount)
      const tx = await anchorProgram.instruction.transfer(new BN(amount * 1000000000), {
        accounts: {
          from,
          to,
          systemProgram: anchor.web3.SystemProgram.programId
        },     
      } as any);
      console.log(tx)
      transaction.add(tx);
      transaction = await wallet.signTransaction(transaction);
      let signature = await anchor.web3.sendAndConfirmRawTransaction(connection, transaction.serialize());
      console.log("Submitted transaction " + signature + ", awaiting confirmation")
      await connection.confirmTransaction(signature)
      console.log("Transaction " + signature + " confirmed")
    }
    else {
      const tx = await anchorProgram.instruction.transfer(new BN(amount), {
        accounts: {
          from, to,
          systemProgram: anchor.web3.SystemProgram.programId
        }
      })

      console.log(tx);
      transaction.add(tx);
      anchor.web3.sendAndConfirmTransaction(connection, transaction, [anchor.web3.Keypair.fromSecretKey(new Uint8Array(donor as Array<number>))]);
    }
  }
  
  const onFinish = async() => {
    if (isOwner()) {
      console.log('start')
      await sendLamports(donationId, ownerId, Number(donationAmount) * Math.pow(10, 9));
      console.log(`send ${donationAmount} lamport to ${ownerId.toBase58()}`);
    }
    else {
      console.log('not owner sending')
      console.log(wallet.publicKey, donationId, Number(donationAmount) * Math.pow(10, 9))
      await sendLamports(wallet.publicKey as PublicKey, donationId, Number(donationAmount));
      console.log(`send ${donationAmount} lamport from ${wallet.publicKey?.toBase58()}`);
    }
  }
  
  return (
      <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
          <Toolbar>
          <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
              DONATION
          </Typography>
          {connected ?
          <p>{wallet.publicKey?.toBase58() ?? 'Unable to get data'}</p>
          :
          <Button style={styles.BtnConnect} variant="contained" onClick={() => { wallet.connect()} }>Connect Wallet</Button>
          }
          </Toolbar>
      </AppBar>
      {connected ? (
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',margin:'auto',height:'80vh',flexDirection:'column'}}>
          <div style={{display:'flex'}}>
              <TextField label="Amount" value={donationAmount} onChange={e => setDonationAmount(e.target.value)}/>
              <Button onClick={onFinish}>Make a donation</Button>
          </div>
          <AsyncBalance>
              <AsyncBalance.Fulfilled>
                  {balance => <p>Your balance: {balance} SOL</p>}
              </AsyncBalance.Fulfilled>
          </AsyncBalance>
      </div>
      ) : null }
      </Box>
  );
}

export default App;