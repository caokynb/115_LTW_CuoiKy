const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^[0-9+() -]{8,15}$/;

export function validateEmail(email) {
  const value = (email || '').trim();
  if (!value) return 'Email không được để trống';
  if (!EMAIL_REGEX.test(value)) return 'Email không đúng định dạng';
  return '';
}

export function validatePassword(password, minLength = 6) {
  if (!password) return 'Mật khẩu không được để trống';
  if (password.length < minLength) {
    return `Mật khẩu phải có ít nhất ${minLength} ký tự`;
  }
  return '';
}

export function validateFullName(fullName) {
  const value = (fullName || '').trim();
  if (!value) return 'Họ và tên không được để trống';
  if (value.length < 2 || value.length > 100) {
    return 'Họ và tên phải có từ 2 đến 100 ký tự';
  }
  return '';
}

export function validatePhone(phone) {
  const value = (phone || '').trim();
  if (!value) return '';
  if (!PHONE_REGEX.test(value)) {
    return 'Số điện thoại phải gồm 8-15 ký tự số hợp lệ';
  }
  return '';
}

export function validateLoginForm(values) {
  const errors = {};
  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;

  if (!values.password) {
    errors.password = 'Mật khẩu không được để trống';
  }

  return errors;
}

export function validateRegisterForm(values) {
  const errors = {};

  const nameError = validateFullName(values.fullName);
  if (nameError) errors.fullName = nameError;

  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;

  const phoneError = validatePhone(values.phone);
  if (phoneError) errors.phone = phoneError;

  const passwordError = validatePassword(values.password, 6);
  if (passwordError) errors.password = passwordError;

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
  }

  return errors;
}
