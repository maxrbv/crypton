import React, { useState, useMemo } from 'react';
import { Connection, Transaction, clusterApiUrl, PublicKey } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import BN from "bn.js"
import provider from './lib/AnchorProvider';
import anchorProgram from './lib/program';
import { fundId, ownerId } from './lib/pubKey'
import fund from './accounts/fund.json'
import Wallet from '@project-serum/sol-wallet-adapter';

import { Button, AppBar, Box, Toolbar, Typography, TextField}  from '@mui/material';


function App() {
  anchor.setProvider(provider);

  const network = clusterApiUrl('devnet');
  const providerUrl = 'https://www.sollet.io';
  const connection = useMemo(() => new Connection(network), [network]);
  const wallet = useMemo(() => new Wallet(providerUrl, network),[providerUrl, network]);
  
  const [connected, setConnected] = useState(false);
  const [donationAmount, setDonationAmount] = useState<string>('');
  const [owner, setOwner] = useState<PublicKey>(PublicKey.default);

  const [balance, setBalance] = useState<number>(0);

  const isOwner = () => owner.toString() === ownerId.toString();

  wallet.on('connect', () => {
    setConnected(true);
    if (wallet.publicKey?.toString() === ownerId.toString()) {
      setOwner(ownerId);
      showBalance(fundId);
    }
    else
      showBalance(wallet.publicKey as PublicKey)
    console.log('Connected: ' + wallet.publicKey?.toBase58());
  });

  wallet.on('disconnect', () => {
    setConnected(false);
    setOwner(PublicKey.default);
    console.log('Disconnected');
  });
  
  const showBalance = async(pubKey: PublicKey) => {
    setBalance(await connection.getBalance(pubKey) / Math.pow(10, 9))
  }

  const prepareTransaction = async(from: PublicKey, to: PublicKey , amount: number) => {
    let transaction = new Transaction();
    transaction.feePayer = from;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
    const fee = await connection.getFeeForMessage(
      transaction.compileMessage(),
      'confirmed'
    );

    if (isOwner()) {
      const tx  = await anchorProgram.instruction.transfer(
        new BN(amount - fee.value),
        {
          accounts: {
            from: from,
            to: to,
            systemProgram: anchor.web3.SystemProgram.programId
        }
      });
      transaction.add(tx);
      anchor.web3.sendAndConfirmTransaction(connection, transaction, [anchor.web3.Keypair.fromSecretKey(new Uint8Array(fund as Array<number>))]);
      console.log("Transaction confirmed")
    }
    else {
      const tx = await anchorProgram.instruction.transfer(
        new BN(amount),
        {
          accounts: {
            from: from,
            to: to,
            systemProgram: anchor.web3.SystemProgram.programId
        },     
      } as any);
      transaction.add(tx);
      transaction = await wallet.signTransaction(transaction);
      let signature = await anchor.web3.sendAndConfirmRawTransaction(connection, transaction.serialize());
      console.log("Transaction signed " + signature);
      await connection.confirmTransaction(signature);
      console.log("Transaction " + signature + " confirmed");
    }
  }
  
  const sendDonation = async() => {
    if (isOwner()) {
      const fundBalance = await connection.getBalance(fundId);
      console.log('Preparing transaction')
      await prepareTransaction(fundId, ownerId, fundBalance);
      await showBalance(fundId);
      console.log(`Withdrawed ${fundBalance} lamports to ${ownerId.toBase58()}`);
    }
    else {
      console.log('Preparing transaction')
      await prepareTransaction(wallet.publicKey as PublicKey, fundId, Number(donationAmount));
      await showBalance(wallet.publicKey as PublicKey);
      console.log(`Sent ${donationAmount} lamports from ${wallet.publicKey?.toBase58()}`);
    }
  }
  
  return (
    <Box sx={{ flexGrow: 1 }}>
    <AppBar position="static">
      <Toolbar>
      <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
        DONATION
      </Typography>
      {connected ? (
      <Button style={{height:'5vh',width:'30vh',fontSize:'20px'}} variant="contained" color="error" onClick={() => { wallet.disconnect()} }>Disconnect</Button>
      ) :
      <Button style={{height:'5vh',width:'30vh',fontSize:'20px'}} variant="contained" color="success" onClick={() => { wallet.connect()} }>Connect Wallet</Button>
      }
      </Toolbar>
    </AppBar>
    {connected ? (
    <div id='main' style={{display:'flex',justifyContent:'center',alignItems:'center',margin:'auto',height:'10vh',flexDirection:'column',paddingTop:'60px'}}>
      {isOwner() ? (
      <><div id='wallet'>
        <p style={{fontSize:'32px'}}>Account({wallet.publicKey?.toBase58() ?? 'Unable to get data'})</p>
        <p style={{fontSize:'20px'}}>Curent fund balance: {balance} SOL</p>
      </div>
      <div id='donation' style={{display:'flex'}}>
        <Button onClick={sendDonation} style={{marginLeft:'20px', fontSize:'16px'}}>Withdraw donation</Button>
      </div>
      <div id='update'>
        <Button onClick={() => showBalance(fundId)} style={{marginTop:'20px', fontSize:'16px'}}>Update balance</Button>
      </div></>
      ) : (
      <><div id='wallet'>
        <p style={{fontSize:'32px'}}>Account({wallet.publicKey?.toBase58() ?? 'Unable to get data'})</p>
        <p style={{fontSize:'20px'}}>Curent balance: {balance} SOL</p>
      </div>
      <div id='donation' style={{display:'flex'}}>
        <TextField label="Amount (lamports)" value={donationAmount} onChange={e => setDonationAmount(e.target.value)}/>
        <Button onClick={sendDonation} style={{marginLeft:'20px', fontSize:'16px'}}>Make a donation</Button>
      </div>
      <div id='update'>
        <Button onClick={() => showBalance(wallet.publicKey as PublicKey)} style={{marginTop:'20px', fontSize:'16px'}}>Update balance</Button>
      </div></>
      )}
    </div>
    ) : null }
    </Box>
  );
}

export default App;