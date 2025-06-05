// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DiplomaCert {
    // Structure pour stocker les informations d'un diplôme
    struct Diploma {
        string studentName;
        string specialization;
        uint256 issueDate;
        string ipfsHash;
        bool isValid;
    }

    // Mapping pour stocker les diplômes par adresse de l'étudiant
    mapping(address => Diploma) public diplomas;
    
    // Liste des adresses des étudiants diplômés
    address[] public graduatesList;

    // Adresse de l'administrateur (établissement universitaire)
    address public admin;

    // Événements
    event DiplomaAdded(address indexed student, string ipfsHash, uint256 timestamp);
    event DiplomaRevoked(address indexed student, uint256 timestamp);

    // Modificateur pour restreindre l'accès à l'administrateur
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    // Constructeur
    constructor() {
        admin = msg.sender;
    }

    // Fonction pour ajouter un nouveau diplôme
    function addDiploma(
        address student,
        string memory studentName,
        string memory specialization,
        string memory ipfsHash
    ) public onlyAdmin {
        require(diplomas[student].isValid == false, "Diploma already exists for this student");
        
        diplomas[student] = Diploma({
            studentName: studentName,
            specialization: specialization,
            issueDate: block.timestamp,
            ipfsHash: ipfsHash,
            isValid: true
        });
        
        graduatesList.push(student);
        
        emit DiplomaAdded(student, ipfsHash, block.timestamp);
    }

    // Fonction pour révoquer un diplôme
    function revokeDiploma(address student) public onlyAdmin {
        require(diplomas[student].isValid == true, "No valid diploma exists for this student");
        
        diplomas[student].isValid = false;
        
        emit DiplomaRevoked(student, block.timestamp);
    }

    // Fonction pour obtenir les informations d'un diplôme
    function getDiploma(address student) public view returns (
        string memory studentName,
        string memory specialization,
        uint256 issueDate,
        string memory ipfsHash,
        bool isValid
    ) {
        Diploma memory diploma = diplomas[student];
        return (
            diploma.studentName,
            diploma.specialization,
            diploma.issueDate,
            diploma.ipfsHash,
            diploma.isValid
        );
    }

    // Fonction pour vérifier l'authenticité d'un diplôme
    function verifyDiploma(address student) public view returns (bool) {
        return diplomas[student].isValid;
    }

    // Fonction pour obtenir le nombre total de diplômés
    function getTotalGraduates() public view returns (uint256) {
        return graduatesList.length;
    }

    // Fonction pour transférer les droits d'administrateur
    function transferAdmin(address newAdmin) public onlyAdmin {
        require(newAdmin != address(0), "Invalid address");
        admin = newAdmin;
    }
}