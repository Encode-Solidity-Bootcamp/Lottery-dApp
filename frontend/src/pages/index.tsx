import Head from 'next/head'
import Image from 'next/image'
import { Inter } from 'next/font/google'
import { CountdownCircleTimer } from 'react-countdown-circle-timer'

import 'bootstrap/dist/css/bootstrap.css'
import styles from '@/styles/Home.module.css'
import React, { useEffect, useRef, useState } from 'react'
import { ethers, BigNumber, Contract, providers, utils } from 'ethers'
import Web3Modal from 'web3modal'
import {
  LOTTERY_CONTRACT,
  LOTTERY_TOKEN_CONTRACT,
  LOTTERY_ABI,
  TOKEN_ABI,
} from '../constants'
import useWindowSize from 'react-use/lib/useWindowSize'
import Confetti from 'react-confetti'

const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  const zero = BigNumber.from(0)
  const { width, height } = useWindowSize()

  // walletConnected keep track of whether the user's wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false)
  //set address
  const [address, setAddress] = useState('')
  // loading is set to true when we are waiting for a transaction to get mined
  const [loading, setLoading] = useState(false)
  // checks if the currently connected MetaMask wallet is the owner of the contract
  const [isOwner, setIsOwner] = useState(false)
  //check the state of the lottery
  const [isOpened, setIsOpened] = useState(false)
  //Get the Users ETh balance
  const [ethBalance, setEtherBalance] = useState(zero)
  //get the users token balance
  const [tokenBalance, setTokenBalance] = useState(zero)
  //set Lottery duration
  const [duration, setDuration] = useState(10)
  //set the tokens to be burnt
  const [amountToBurn, setAmountToBurn] = useState(zero)
  // Create a reference to the Web3 Modal (used for connecting to Metamask) which persists as long as the page is open
  const web3ModalRef: any = useRef()

  

  //      *********Functions*********

  const getProviderOrSigner = async (needSigner = false) => {
    // Connect to Metamask
    // Since we store `web3Modal` as a reference, we need to access the `current` value to get access to the underlying object
    const provider = await web3ModalRef.current.connect()
    const web3Provider = new providers.Web3Provider(provider)

    const accounts = await ethereum.request({
      method: 'eth_requestAccounts',
    })

    const address = accounts[0]
    setAddress(address)

    // If user is not connected to the sepolia network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork()
    if (chainId !== 11155111) {
      window.alert('Change the network to Sepolia')
      throw new Error('Change network to Sepolia')
    }

    if (needSigner) {
      const signer = web3Provider.getSigner()
      return signer
    }
    return web3Provider
  }

  /**
   * connectWallet: Connects the MetaMask wallet
   */
  const connectWallet = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // When used for the first time, it prompts the user to connect their wallet
      await getProviderOrSigner()
      setWalletConnected(true)
    } catch (err) {
      console.error(err)
    }
  }
  const getEtherBalance = async (
    provider: any,
    address: any,
    contract = false,
  ) => {
    try {
      // If the caller has set the `contract` boolean to true, retrieve the balance of
      // ether in the `exchange contract`, if it is set to false, retrieve the balance
      // of the user's address
      if (contract) {
        const balance = await provider.getBalance(LOTTERY_CONTRACT)
        return balance
      } else {
        const balance = await provider.getBalance(address)
        return balance
      }
    } catch (err) {
      console.error(err)
      return 0
    }
  }
  const getTokenBalance = async (provider: any, address: any) => {
    try {
      const tokenContract = new Contract(
        LOTTERY_TOKEN_CONTRACT,
        TOKEN_ABI,
        provider,
      )
      const balanceOfToken = await tokenContract.balanceOf(address)
      return balanceOfToken
    } catch (err) {
      console.error(err)
    }
  }

  const getAmounts = async () => {
    try {
      const provider = await getProviderOrSigner(false)
      const signer: any = await getProviderOrSigner(true)
      const address = await signer.getAddress()
      // get the amount of eth in the user's account
      const _ethBalance = await getEtherBalance(provider, address)
      // get the amount of `Teamm11` tokens held by the user
      const _tokenBalance = await getTokenBalance(provider, address)

      setEtherBalance(_ethBalance)
      setTokenBalance(_tokenBalance)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    // if wallet is not connected, create a new instance of Web3Modal and connect the MetaMask wallet
    if (!walletConnected) {
      // Assign the Web3Modal class to the reference object by setting its `current` value
      // The `current` value is persisted throughout as long as this page is open
      web3ModalRef.current = new Web3Modal({
        network: 'sepolia',
        providerOptions: {},
        disableInjectedProvider: false,
      })
      connectWallet()
      getAmounts()
    }
  }, [walletConnected])

  const renderConnectButton = () => {
    // If wallet is not connected, return a button which allows them to connect their wallet
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className="btn btn-dark btn-lg">
          Connect your wallet
        </button>
      )
    } else {
      return <button className="btn btn-dark btn-md">{address}</button>
    }

  }

  //call openBet function 
  const openBet = async (duration:string) => {
    if(!walletConnected){
      return (<button onClick={connectWallet} className="btn btn-dark btn-lg">
      Connect your wallet
    </button>)
    } else {
      const signer = await getProviderOrSigner(true);
      const provider = await getProviderOrSigner(false);
      const currentBlock = await provider.getBlock("latest");
      const lotteryContract = new ethers.Contract(LOTTERY_CONTRACT,LOTTERY_ABI,signer);
      const timeTarget = currentBlock.timestamp + parseFloat(duration);
      const tx = await lotteryContract.openBets(timeTarget);
      const txReceipt = await tx.wait();
      window.alert(txReceipt.transactionHash);
      return txReceipt.transactionHash;
      
    }
  }

  // Logic for buyTokensForLottery()

  const buyTokensForLottery = async (amount: string) => {
    if(!walletConnected){
      return (<button onClick={connectWallet} className="btn btn-dark btn-lg">
      Connect your wallet
    </button>)
    } else {
      const TOKEN_RATIO = 10;
      const signer = await getProviderOrSigner(true);
      const provider = await getProviderOrSigner(false);
      const address = await signer.getAddress();
      const lotteryContract = new ethers.Contract(LOTTERY_CONTRACT,LOTTERY_ABI,signer);
      const tx = await lotteryContract.connect(signer).purchaseTokens({
        value: ethers.utils.parseEther(amount).div(TOKEN_RATIO),
      });
      const txReceipt = await tx.wait();
      window.alert(txReceipt.transactionHash);
      return txReceipt.transactionHash;
    }
  }

  return (
    <>
      <Head>
        <title>Team 11 </title>
        <meta name="description" content="Encode Solidity Bootcamp" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <h1 className="text-center py-3 mx-5 pt-5"> ENCODE BOOTCAMP LOTTERY</h1>
      <br />
      <h6 className="text-center py-3 mx-5 pt-5"> Every one is a winner</h6>
      <main className={styles.main}>
        <div className={styles.description}>
          <p>
            Balance(ETH): {utils.formatEther(ethBalance)}ETH <br />
            Balance(Team11) {utils.formatEther(tokenBalance)} T11
          </p>

          <div>{renderConnectButton()}</div>
        </div>
        <div className="card text-center">
          <div className="card-header">
            <h3>Lottery status: closed</h3>
          </div>
          <div className="card-body">
            <h5 className="card-title">Lottery countDown</h5>
            <div className="align-center px-5 mx-4">
              <CountdownCircleTimer
                isPlaying
                size={100}
                duration={duration}
                colors={['green', 'blue', 'yellow', 'red']}
              >
                {({ remainingTime }) => remainingTime}
              </CountdownCircleTimer>
            </div>
          </div>
          <button className="btn btn-dark btn-md mt-2">close lottery</button>

          <div className="card-footer text-muted">Duration set: 5</div>
        </div>
        <div className={styles.center}>
          <div className="card text-center">
            <div className="card-header">Buy Team11 Tokens (T11)</div>
            <div className="card-body">
              <label htmlFor="">Amount: </label>
              <input className="form-control" type="number" />
              <button className="btn btn-dark btn-md mt-2">Buy</button>
            </div>
            <div className="card-footer text-muted">pay in ETH</div>
          </div>

          <div className="card text-center mx-5">
            <div className="card-header">Enter Lottery</div>
            <div className="card-body">
              <label htmlFor="">
                Tickets(more tickets=better <br /> chance to win):{' '}
              </label>
              <input
                placeholder="enter amount of tickets"
                className="form-control"
                type="number"
              />
              <button className="btn btn-dark btn-md mt-2">Bet</button>
            </div>
            <div className="card-footer text-muted">pay in T11</div>
          </div>
          <br />
          <div className="card text-center mx-5">
            <div className="card-header">Buy ETH</div>
            <div className="card-body">
              <label htmlFor="">Amount: </label>
              <input
                placeholder="swap back ETH"
                className="form-control"
                type="number"
              />
              <button className="btn btn-dark btn-md mt-2">Buy</button>
            </div>
            <div className="card-footer text-muted">pay in T11</div>
          </div>
        </div>

        <div className={styles.grid}>
          <div className="card text-center mx-5">
            <div className="card-header">Open Bet</div>
            <div className="card-body">
              <label htmlFor="">Duration: </label>
              <input
                placeholder="Time in seconds"
                className="form-control"
                type="number"
              />
              <button className="btn btn-dark btn-md mt-2" >set</button>
            </div>
          </div>

          <div className="card text-center">
            <div className="card-header">Prize Board</div>
            <div className="card-body">
              <h5 className="card-title">Did you win the lottery? </h5>
              <p className="card-text">Prize won: </p>
              <button className="btn btn-dark">Withdraw Winnings</button>
          </div> 
           </div>
          <Confetti width={width} height={height} />
        
          
          </div>
        
      </main>
    </>
  )
}
