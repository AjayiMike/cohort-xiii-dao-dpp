import { useCallback, useState } from "react";
import { useEffect } from "react";
import {
    useAccount,
    usePublicClient,
    useWalletClient,
    useWatchContractEvent,
    useWriteContract,
} from "wagmi";
import { governanceContractConfig, multicalCaontract } from "../config";
import { ethers } from "ethers";
import { useEthersProvider } from "./ethersAdapter";
import { toast } from "sonner";
import { decodeFunctionResult, encodeFunctionData, zeroAddress } from "viem";

const useProposals = () => {
    const [proposals, setProposals] = useState([]);
    const [proposalQuorum, setProposalQuorum] = useState();
    const publicClient = usePublicClient();
    const walletClient = useWalletClient();
    const { address } = useAccount();
    const ethersProvider = useEthersProvider();
    const { writeContractAsync } = useWriteContract();

    useEffect(() => {
        (async () => {
            if (!publicClient) return;
            const proposalCount = await publicClient.readContract({
                ...governanceContractConfig,
                functionName: "getProposalCount",
            });

            const proposalQuorum = await publicClient.readContract({
                ...governanceContractConfig,
                functionName: "quorum",
            });

            setProposalQuorum(Number(proposalQuorum));

            const data = [];
            // for (let i = 0; i < proposalCount; i++) {
            //     const proposal = await publicClient.readContract({
            //         ...governanceContractConfig,
            //         functionName: "proposals",
            //         args: [i],
            //     });

            //     let hasVoted = false;
            //     if (address) {
            //         console.log("address: ", address);

            //         hasVoted = await publicClient.readContract({
            //             ...governanceContractConfig,
            //             functionName: "hasVoted",
            //             args: [i, address],
            //         });
            //     }

            //     data.unshift({
            //         id: i,
            //         description: proposal[0],
            //         recipient: proposal[1],
            //         amount: proposal[2],
            //         voteCount: proposal[3],
            //         deadline: proposal[4],
            //         executed: proposal[5],
            //         hasVoted: hasVoted,
            //     });
            // }

            // const proposalRequest = [];
            // const hasVotedRequest = [];
            // for (let i = 0; i < proposalCount; i++) {
            //     proposalRequest.push(
            //         publicClient.readContract({
            //             ...governanceContractConfig,
            //             functionName: "proposals",
            //             args: [i],
            //         })
            //     );
            //     hasVotedRequest.push({
            //         ...governanceContractConfig,
            //         functionName: "hasVoted",
            //         args: [i, address],
            //     });
            // }
            // console.log("proposalRequest: ", proposalRequest);

            // const responses = await Promise.all([
            //     ...proposalRequest,
            //     ...hasVotedRequest,
            // ]);

            // const proposalResponse = responses.slice(0, responses.length / 2);
            // const hasVotedResponse = responses.slice(responses.length / 2);

            // proposalResponse.forEach((p, i) => {
            //     data.unshift({
            //         id: i,
            //         description: p[0],
            //         recipient: p[1],
            //         amount: p[2],
            //         voteCount: p[3],
            //         deadline: p[4],
            //         executed: p[5],
            //         hasVoted: hasVotedResponse[i],
            //     });
            // });

            // MULTICALL WAY
            const calls = [];

            for (let i = 0; i < proposalCount; i++) {
                calls.push({
                    target: governanceContractConfig.address,
                    callData: encodeFunctionData({
                        abi: governanceContractConfig.abi,
                        functionName: "proposals",
                        args: [i],
                    }),
                });
            }
            for (let i = 0; i < proposalCount; i++) {
                calls.push({
                    target: governanceContractConfig.address,
                    callData: encodeFunctionData({
                        abi: governanceContractConfig.abi,
                        functionName: "hasVoted",
                        args: [i, address ?? zeroAddress],
                    }),
                });
            }

            console.log("calls: ", calls);

            const callResults = await publicClient.readContract({
                ...multicalCaontract,
                functionName: "aggregate",
                args: [calls],
            });

            const proposalsCallResult = callResults[1].slice(
                0,
                callResults[1].length / 2
            );
            const hasVotedCallResult = callResults[1].slice(
                callResults[1].length / 2
            );

            proposalsCallResult.forEach((r, i) => {
                const p = decodeFunctionResult({
                    abi: governanceContractConfig.abi,
                    functionName: "proposals",
                    data: r,
                });

                const hasVoted = decodeFunctionResult({
                    abi: governanceContractConfig.abi,
                    functionName: "hasVoted",
                    data: hasVotedCallResult[i],
                });
                data.unshift({
                    id: i,
                    description: p[0],
                    recipient: p[1],
                    amount: p[2],
                    voteCount: p[3],
                    deadline: p[4],
                    executed: p[5],
                    hasVoted,
                });
            });

            setProposals(data);
        })();
    }, [address, publicClient]);

    // wagmi
    useWatchContractEvent({
        abi: governanceContractConfig.abi,
        address: governanceContractConfig.address,
        eventName: "ProposalCreated",
        onLogs: (logs) => {
            console.log("log: ", logs);
        },
    });

    // viem
    // useEffect(() => {
    //     const onProposalsCreated = (evt) => {
    //         console.log("proposal created: ", evt);

    //         setProposals((prev) => [
    //             {
    //                 id: Number(evt[0].args.proposalId),
    //                 description: evt[0].args.description,
    //                 recipient: evt[0].args.recipient,
    //                 amount: evt[0].args.amount,
    //                 voteCount: 0,
    //                 deadline: evt[0].args.deadline,
    //                 executed: false,
    //                 hasVoted: false,
    //             },
    //             ...prev,
    //         ]);
    //     };

    //     const ProposalCreatedEventAbiItem = governanceContractConfig.abi.find(
    //         (x) => x.name === "ProposalCreated" && x.type === "event"
    //     );

    //     const unwatch = publicClient.watchEvent({
    //         address: governanceContractConfig.address,
    //         event: ProposalCreatedEventAbiItem,
    //         onLogs: onProposalsCreated,
    //     });

    //     return () => unwatch();
    // }, [publicClient]);

    // Ethers
    // useEffect(() => {
    //     const onProposalsCreated = (
    //         proposalId,
    //         description,
    //         recipient,
    //         amount,
    //         deadline
    //     ) => {
    //         setProposals((prev) => [
    //             {
    //                 id: Number(proposalId),
    //                 description: description,
    //                 recipient: recipient,
    //                 amount: amount,
    //                 voteCount: 0,
    //                 deadline: deadline,
    //                 executed: false,
    //                 hasVoted: false,
    //             },
    //             ...prev,
    //         ]);
    //     };

    //     const contract = new ethers.Contract(
    //         governanceContractConfig.address,
    //         governanceContractConfig.abi,
    //         ethersProvider
    //     );

    //     contract.on("ProposalCreated", onProposalsCreated);

    //     return () => contract.off("ProposalCreated", onProposalsCreated);
    // }, [ethersProvider, publicClient]);

    useEffect(() => {
        const onVote = (voter, proposalId, weight) => {
            setProposals((prev) =>
                prev.map((p) => {
                    if (Number(proposalId) !== p.id) return p;

                    return {
                        ...p,
                        voteCount: p.voteCount + weight,
                        hasVoted: address.toLowerCase() === voter.toLowerCase(),
                    };
                })
            );
        };

        const contract = new ethers.Contract(
            governanceContractConfig.address,
            governanceContractConfig.abi,
            ethersProvider
        );

        contract.on("Voted", onVote);

        return () => contract.off("Voted", onVote);
    }, [address, ethersProvider, publicClient]);

    useEffect(() => {
        const onExecuted = (proposalId, success) => {
            setProposals((prev) =>
                prev.map((p) => {
                    if (Number(proposalId) !== p.id) return p;

                    return {
                        ...p,
                        executed: success,
                    };
                })
            );
        };

        const contract = new ethers.Contract(
            governanceContractConfig.address,
            governanceContractConfig.abi,
            ethersProvider
        );

        contract.on("Executed", onExecuted);

        return () => contract.off("Executed", onExecuted);
    }, [address, ethersProvider, publicClient]);

    const voteOnProposal = useCallback(
        async (id) => {
            if (!address || !walletClient) return;
            if (id === undefined) return;

            try {
                const hash = await writeContractAsync({
                    ...governanceContractConfig,
                    functionName: "vote",
                    args: [id],
                });
                const receipt = await publicClient.waitForTransactionReceipt({
                    hash,
                });

                if (receipt.status === "success") {
                    toast.success("Voting succeussfull", {
                        description: `You have successfully voted on proposal #${id}`,
                    });
                } else {
                    toast.error("Error voting on proposal", {
                        description: "Voting failed",
                    });
                }
            } catch (error) {
                console.log("errro: ", error);
            }
        },
        [address, publicClient, walletClient, writeContractAsync]
    );

    const executeProposal = useCallback(
        async (id) => {
            if (!address || !walletClient) return;
            if (id === undefined) return;

            try {
                const simulationResult = await publicClient.simulateCalls({
                    account: address,
                    calls: [
                        {
                            to: governanceContractConfig.address,
                            abi: governanceContractConfig.abi,
                            functionName: "executeProposal",
                            args: [id],
                        },
                    ],
                });
                console.log("simulationResult: ", simulationResult);

                if (simulationResult.results[0].status === "failure") {
                    toast.error("Error executing proposal", {
                        description:
                            simulationResult.results[0].error.cause.reason,
                    });
                    return;
                }

                const hash = await writeContractAsync({
                    ...governanceContractConfig,
                    functionName: "executeProposal",
                    args: [id],
                });
                const receipt = await publicClient.waitForTransactionReceipt({
                    hash,
                });

                if (receipt.status === "success") {
                    toast.success("execution succeussfull", {
                        description: `You have successfully executed proposal #${id}`,
                    });
                } else {
                    toast.error("Error executing proposal", {
                        description: "execution failed",
                    });
                }
            } catch (error) {
                console.log("errro: ", error);
            }
        },
        [address, publicClient, walletClient, writeContractAsync]
    );

    return { proposals, proposalQuorum, voteOnProposal, executeProposal };
};

export default useProposals;
