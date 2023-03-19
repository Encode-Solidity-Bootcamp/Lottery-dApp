import {ethers} from 'hardhat'
import { LotteryToken__factory, Lottery__factory } from "../typechain-types";



const BET_PRICE = 1;
const BET_FEE = 0.2;
const TOKEN_RATIO = 1;

async function main() {
 
  const lotteryContractFactory = await ethers.getContractFactory("Lottery");
  const lotteryContract = await lotteryContractFactory.deploy(
    "Team11Token",
    "T11",
    TOKEN_RATIO,
    ethers.utils.parseEther(BET_PRICE.toFixed(18)),
    ethers.utils.parseEther(BET_FEE.toFixed(18))
  );

  const deployTxReceipt = await lotteryContract.deployTransaction.wait(1);
    console.log(
        `The Lottery contract was deployed at the address ${lotteryContract.address}`
    );
    const tokenAddress = await lotteryContract.paymentToken();
    console.log(   `Token address:  ${tokenAddress}`)
    const tokenFactory =await ethers.getContractFactory("LotteryToken");
   
  
}

const runMain = async () => {
   try {
     await main()
     process.exit(0)
   } catch (error) {
    console.log(error)
    process.exit(1);
   }
}
runMain();