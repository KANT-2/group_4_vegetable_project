export function adminPasswordError(
  current: string,
  password: string,
  confirmation: string,
) {
  if (!current || !password || !confirmation)
    return "현재 비밀번호와 새 비밀번호를 모두 입력해 주세요.";
  if (current.length > 200) return "현재 비밀번호를 확인해 주세요.";
  if (password !== confirmation) return "새 비밀번호가 일치하지 않습니다.";
  if (
    password.length < 12 ||
    password.length > 128 ||
    !/^[\x21-\x7e]+$/.test(password)
  )
    return "새 비밀번호는 공백 없이 영문 대·소문자, 숫자, 기호를 사용해 12~128자로 입력해 주세요.";
  if (current === password)
    return "현재 비밀번호와 다른 비밀번호를 입력해 주세요.";
  return "";
}
