export type DemographicField = {
  key: string;
  question: string;
  type: "text" | "radio" | "select";
  placeHolder?: string;
  options?: string[];
  inputType?: string;
};

export const demographic: DemographicField[] = [
  {
    key: "phoneNumber",
    question: "Phone Number",
    type: "text",
    placeHolder: "03XXXXXXXXX",
    inputType: "tel",
  },
  {
    key: "name",
    question: "Name",
    type: "text",
    placeHolder: "Enter your name",
    inputType: "text",
  },
  {
    key: "father_husband",
    question: "Father / Husband Name",
    type: "text",
    placeHolder: "Enter name",
    inputType: "text",
  },
  {
    key: "age",
    question: "Age",
    type: "text",
    placeHolder: "Enter age",
    inputType: "number",
  },
  {
    key: "gender",
    question: "Gender",
    type: "radio",
    options: ["Male", "Female", "Other"],
    inputType: "text", // optional for radios
  },
  {
    key: "qualification",
    question: "Qualification (Select One)",
    type: "select",
    options: [
      "Primary",
      "Middle",
      "Matric (10th)",
      "Intermediate / FA / FSC (12th)",
      "Diploma / DAE",
      "Bachelor’s Degree",
      "Master’s Degree",
      "MPhil",
      "PhD",
      "Professional Certification",
      "No Formal Education",
    ],
    inputType: "text",
  },
  {
    key: "profession",
    question: "Occupation (Select One):",
    type: "select",
    options: [
      "Student",
      "Self-Employed",
      "Business Owner",
      "Job Holder / Employee",
      "Freelancer",
      "Housewife / Homemaker",
      "Unemployed",
      "Retired",
      "Government Employee",
      "Private Sector Employee",
      "Daily Wage Worker",
      "Teacher / Education Sector",
      "Healthcare Professional",
      "Driver / Rider",
      "Shopkeeper",
    ],
    inputType: "text",
  },
];
