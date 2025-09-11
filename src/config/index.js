import { multicallAbi, QUADRATIC_GOVERNANCE_VOTING_CONTRACT_ABI } from "./ABI";

export const governanceContractConfig = {
    address: import.meta.env.VITE_QUADRATIC_GOVERNANCE_VOTING_CONTRACT,
    abi: QUADRATIC_GOVERNANCE_VOTING_CONTRACT_ABI,
};

export const multicalCaontract = {
    address: import.meta.env.VITE_MULTICALL_CONTRACT,
    abi: multicallAbi,
};
