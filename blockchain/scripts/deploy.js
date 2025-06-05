const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Get the default provider for the local network
  const provider = hre.ethers.provider;
  
  // Get the deployer's address (first account from the node)
  const [deployer] = await hre.ethers.getSigners();
  console.log("Déploiement avec l'adresse :", deployer.address);

  // Get the balance
  const balance = await provider.getBalance(deployer.address);
  console.log("Solde du déployeur :", hre.ethers.formatEther(balance), "ETH");

  console.log("Déploiement du contrat DiplomaCert...");
  const DiplomaCert = await hre.ethers.getContractFactory("DiplomaCert");
  const contract = await DiplomaCert.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("Contrat DiplomaCert déployé à l'adresse :", contractAddress);

  // Save the contract address and ABI for the frontend
  const frontendDir = path.join(__dirname, "..", "frontend", "src", "contracts");
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  // Save contract address
  fs.writeFileSync(
    path.join(frontendDir, "contract-address.json"),
    JSON.stringify({ DiplomaCert: contractAddress }, undefined, 2)
  );

  // Get contract ABI
  const contractArtifact = await hre.artifacts.readArtifact("DiplomaCert");
  
  // Save contract ABI
  fs.writeFileSync(
    path.join(frontendDir, "DiplomaCert.json"),
    JSON.stringify(contractArtifact, null, 2)
  );

  console.log("Adresse et ABI enregistrées dans frontend/src/contracts/");
  
  // Verify the contract was deployed correctly
  const code = await provider.getCode(contractAddress);
  if (code === '0x') {
    throw new Error("Le contrat n'a pas été correctement déployé (pas de code à l'adresse)");
  }
  console.log("Vérification: code du contrat trouvé à l'adresse", contractAddress);
}

main().catch((error) => {
  console.error("Erreur lors du déploiement:", error);
  process.exitCode = 1;
});
