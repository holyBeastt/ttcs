const validateApprovalValue = (value, fieldName) => {
  const num = Number(value);
  if (!(num === 0 || num === 1)) {
    throw new Error(`${fieldName} chi nhan 0 hoac 1`);
  }
  return num;
};

module.exports = {
  validateApprovalValue,
};
