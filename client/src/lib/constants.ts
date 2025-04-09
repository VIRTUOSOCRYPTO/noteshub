export const DEPARTMENTS = [
  { value: "NT", label: "Nanotechnology", code: "NT" },
  { value: "EEE", label: "Electrical & Electronics Engineering", code: "EE" },
  { value: "ECE", label: "Electronics & Communication Engineering", code: "EC" },
  { value: "CSE", label: "Computer Science & Engineering", code: "CS" },
  { value: "ISE", label: "Information Science & Engineering", code: "IS" },
  { value: "AIML", label: "Artificial Intelligence & Machine Learning", code: "CI" },
  { value: "AIDS", label: "Artificial Intelligence & Data Science", code: "AD" },
  { value: "MECH", label: "Mechanical Engineering", code: "ME" },
  { value: "CH", label: "Chemical Engineering", code: "CH" },
  { value: "IEM", label: "Industrial Engineering & Management", code: "IM" },
  { value: "ETE", label: "Electronics & Telecom Engineering", code: "ET" },
  { value: "CVE", label: "Civil Engineering", code: "CV" },
  { value: "BTE", label: "Biotechnology", code: "BT" },
  { value: "EIE", label: "Electronics & Instrumentation", code: "EI" }
];

// Section constants removed as per requirements

// Department-specific subjects
export const DEPARTMENT_SUBJECTS = {
  // Computer Science & Engineering
  "CSE": [
    { value: "dsa", label: "Data Structures & Algorithms" },
    { value: "dbms", label: "Database Management Systems" },
    { value: "os", label: "Operating Systems" },
    { value: "cn", label: "Computer Networks" },
    { value: "web", label: "Web Development" },
    { value: "ml", label: "Machine Learning" },
    { value: "se", label: "Software Engineering" },
    { value: "dld", label: "Digital Logic Design" },
    { value: "toc", label: "Theory of Computation" },
    { value: "cd", label: "Compiler Design" }
  ],
  
  // Information Science & Engineering
  "ISE": [
    { value: "dsa", label: "Data Structures & Algorithms" },
    { value: "dbms", label: "Database Management Systems" },
    { value: "os", label: "Operating Systems" },
    { value: "cn", label: "Computer Networks" },
    { value: "is", label: "Information Security" },
    { value: "bi", label: "Business Intelligence" },
    { value: "se", label: "Software Engineering" },
    { value: "ds", label: "Data Science" },
    { value: "ooad", label: "Object Oriented Analysis & Design" }
  ],
  
  // Electronics & Communication Engineering
  "ECE": [
    { value: "signals", label: "Signals & Systems" },
    { value: "emw", label: "Electromagnetic Waves" },
    { value: "dc", label: "Digital Circuits" },
    { value: "vlsi", label: "VLSI Design" },
    { value: "comm", label: "Communication Systems" },
    { value: "dsp", label: "Digital Signal Processing" },
    { value: "control", label: "Control Systems" },
    { value: "microprocessors", label: "Microprocessors & Microcontrollers" }
  ],
  
  // Electrical & Electronics Engineering
  "EEE": [
    { value: "power", label: "Power Systems" },
    { value: "machines", label: "Electrical Machines" },
    { value: "control", label: "Control Systems" },
    { value: "pe", label: "Power Electronics" },
    { value: "em", label: "Electromagnetic Fields" },
    { value: "hvac", label: "High Voltage AC/DC Transmission" },
    { value: "energy", label: "Renewable Energy Systems" }
  ],
  
  // Mechanical Engineering
  "MECH": [
    { value: "thermo", label: "Thermodynamics" },
    { value: "fm", label: "Fluid Mechanics" },
    { value: "materials", label: "Engineering Materials" },
    { value: "manufacturing", label: "Manufacturing Processes" },
    { value: "mechanics", label: "Engineering Mechanics" },
    { value: "design", label: "Machine Design" },
    { value: "cad", label: "Computer Aided Design" },
    { value: "heat", label: "Heat Transfer" }
  ],
  
  // Artificial Intelligence & Machine Learning
  "AIML": [
    { value: "ml", label: "Machine Learning" },
    { value: "dl", label: "Deep Learning" },
    { value: "nlp", label: "Natural Language Processing" },
    { value: "cv", label: "Computer Vision" },
    { value: "rl", label: "Reinforcement Learning" },
    { value: "dsa", label: "Data Structures & Algorithms" },
    { value: "stats", label: "Statistics for AI" },
    { value: "neural", label: "Neural Networks" },
    { value: "bigdata", label: "Big Data Analytics" }
  ],
  
  // Artificial Intelligence & Data Science
  "AIDS": [
    { value: "ml", label: "Machine Learning" },
    { value: "ds", label: "Data Science" },
    { value: "stats", label: "Statistical Methods" },
    { value: "bi", label: "Business Intelligence" },
    { value: "vis", label: "Data Visualization" },
    { value: "mining", label: "Data Mining" },
    { value: "dbms", label: "Database Management Systems" },
    { value: "bigdata", label: "Big Data Analytics" }
  ],
  
  // Nanotechnology
  "NT": [
    { value: "nano-mat", label: "Nanomaterials" },
    { value: "nano-fab", label: "Nanofabrication" },
    { value: "nano-elec", label: "Nanoelectronics" },
    { value: "bio-nano", label: "Bionanotechnology" },
    { value: "nano-char", label: "Nanocharacterization Techniques" }
  ],
  
  // Chemical Engineering
  "CH": [
    { value: "chm-thermo", label: "Chemical Thermodynamics" },
    { value: "reaction", label: "Chemical Reaction Engineering" },
    { value: "transport", label: "Transport Phenomena" },
    { value: "process", label: "Process Control" },
    { value: "separation", label: "Separation Processes" }
  ],
  
  // Industrial Engineering & Management
  "IEM": [
    { value: "om", label: "Operations Management" },
    { value: "quality", label: "Quality Engineering" },
    { value: "logistics", label: "Logistics & Supply Chain" },
    { value: "erp", label: "Enterprise Resource Planning" },
    { value: "project", label: "Project Management" }
  ],
  
  // Electronics & Telecom Engineering
  "ETE": [
    { value: "telecom", label: "Telecommunication Systems" },
    { value: "wireless", label: "Wireless Communication" },
    { value: "antena", label: "Antenna & Wave Propagation" },
    { value: "networks", label: "Wireless Networks" },
    { value: "microwave", label: "Microwave Engineering" }
  ],
  
  // Civil Engineering
  "CVE": [
    { value: "structures", label: "Structural Engineering" },
    { value: "geo-tech", label: "Geotechnical Engineering" },
    { value: "water", label: "Water Resources Engineering" },
    { value: "transport", label: "Transportation Engineering" },
    { value: "construction", label: "Construction Management" },
    { value: "surveying", label: "Surveying & Geomatics" }
  ],
  
  // Biotechnology
  "BTE": [
    { value: "biochem", label: "Biochemistry" },
    { value: "microbio", label: "Microbiology" },
    { value: "genetic", label: "Genetic Engineering" },
    { value: "immunology", label: "Immunology" },
    { value: "bioprocess", label: "Bioprocess Engineering" },
    { value: "molecular", label: "Molecular Biology" }
  ],
  
  // Electronics & Instrumentation
  "EIE": [
    { value: "transducers", label: "Transducers & Sensors" },
    { value: "process-control", label: "Process Control" },
    { value: "industrial", label: "Industrial Instrumentation" },
    { value: "biomedical", label: "Biomedical Instrumentation" },
    { value: "measurement", label: "Measurement Systems" },
    { value: "automation", label: "Industrial Automation" }
  ]
};

// Default subjects for backward compatibility
export const SUBJECTS = [
  { value: "dsa", label: "Data Structures & Algorithms" },
  { value: "dbms", label: "Database Management Systems" },
  { value: "os", label: "Operating Systems" },
  { value: "cn", label: "Computer Networks" },
  { value: "web", label: "Web Development" }
];

export const ACCEPTED_FILE_TYPES = [
  ".pdf", 
  ".doc", 
  ".docx", 
  ".ppt", 
  ".pptx", 
  ".txt", 
  ".md"
];
