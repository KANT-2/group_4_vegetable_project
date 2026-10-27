export type AdminSignupInput = {
  id: string;
  password: string;
  confirmPassword: string;
  name: string;
  email: string;
};

export function adminSignupError(input: AdminSignupInput, google = false) {
  if (
    !input.id.trim() ||
    !input.name.trim() ||
    !input.email.trim() ||
    (!google && (!input.password || !input.confirmPassword))
  )
    return "모든 정보를 입력해 주세요.";
  if (!/^[\x21-\x7e]{4,40}$/.test(input.id))
    return "아이디는 공백 없이 영문 대·소문자, 숫자, 기호로 4~40자 입력해 주세요.";
  if (input.name.trim().length > 60) return "이름은 60자 이내로 입력해 주세요.";
  if (
    input.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)
  )
    return "올바른 이메일 주소를 입력해 주세요.";
  if (
    !google &&
    (input.password.length < 12 ||
      input.password.length > 128 ||
      !/^[\x21-\x7e]+$/.test(input.password))
  )
    return "비밀번호는 영문 대·소문자, 숫자, 기호를 사용할 수 있으며 공백 없이 12~128자로 입력해 주세요.";
  if (!google && input.password !== input.confirmPassword)
    return "비밀번호와 비밀번호 재확인이 일치하지 않습니다.";
  return "";
}
