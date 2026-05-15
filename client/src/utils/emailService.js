import emailjs from "@emailjs/browser";

const EMAILJS_SERVICE_ID  = "";   
const EMAILJS_TEMPLATE_ID = "";  
const EMAILJS_PUBLIC_KEY  = ""; 

export const sendHodNotificationEmail = async ({
  hodEmail,
  hodName,
  employeeName,
  employeeNumber,
  department,
  requestType,
  justification,
  formNumber,
  submittedDate,
}) => {
  const templateParams = {
    hod_email:       hodEmail,
    hod_name:        hodName        || "HOD",
    employee_name:   employeeName   || "Unknown Employee",
    employee_number: employeeNumber || "—",
    department:      department     || "—",
    request_type:    requestType    || "—",
    justification:   justification  || "No justification provided.",
    form_number:     formNumber      || "—",
    submitted_date:  submittedDate  || new Date().toLocaleString(),
  };

  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    templateParams,
    EMAILJS_PUBLIC_KEY
  );
};