# Diploma Certification Application on Blockchain

A decentralized application (DApp) for issuing, managing, and verifying academic diplomas on the Ethereum blockchain. This application ensures the authenticity and immutability of academic credentials while providing a user-friendly interface for both institutions and students.

## 🚀 Features

- **Secure Diploma Issuance**: Issue tamper-proof diplomas on the Ethereum blockchain
- **Instant Verification**: Verify the authenticity of any diploma in seconds
- **Decentralized Storage**: Store diploma documents on IPFS (InterPlanetary File System)
- **Role-Based Access**: Separate interfaces for administrators and students
- **Transparent Records**: All transactions are recorded on the blockchain

## 🛠️ Technology Stack

### Frontend
- **Framework**: React.js with Vite
- **UI**: Tailwind CSS
- **State Management**: React Hooks
- **Web3**: ethers.js
- **Build Tools**: Vite, PostCSS, ESLint

### Blockchain
- **Smart Contracts**: Solidity (v0.8.20)
- **Development**: Hardhat
- **Local Blockchain**: Hardhat Network
- **Testing**: Hardhat test environment

### Storage
- **Decentralized Storage**: IPFS for document storage

## 📦 Project Structure

```
.
├── blockchain/               # Smart contracts and blockchain-related code
│   ├── contracts/            # Solidity smart contracts
│   ├── scripts/              # Deployment and utility scripts
│   └── test/                 # Smart contract tests
└── frontend/                 # React frontend application
    ├── public/               # Static assets
    └── src/                  # Source code
        ├── components/       # Reusable UI components
        ├── contracts/        # Contract ABIs and addresses
        ├── services/         # Business logic and API calls
        └── utils/            # Utility functions
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- MetaMask browser extension
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd App-de-Certification-de-Diplomes
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   cd frontend
   npm install

   # Install blockchain dependencies
   cd ../blockchain
   npm install
   ```

3. **Start local blockchain**
   ```bash
   cd blockchain
   npx hardhat node
   ```
   
   Keep this terminal running and open a new terminal for the next steps.

4. **Deploy smart contracts**
   ```bash
   cd blockchain
   npx hardhat run scripts/deploy.js --network localhost
   ```

5. **Start the frontend**
   ```bash
   cd frontend
   npm run dev
   ```

6. **Access the application**
   Open your browser and navigate to `http://localhost:5173`

## 🔧 Smart Contract

The `DiplomaCert` smart contract provides the following functionality:

- Add new diplomas (admin only)
- Verify diploma authenticity
- Revoke diplomas (admin only)
- View diploma details
- Check admin status

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👏 Acknowledgments

- [Ethereum](https://ethereum.org/)
- [Hardhat](https://hardhat.org/)
- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

---

Made with ❤️ by Hamza Taki
