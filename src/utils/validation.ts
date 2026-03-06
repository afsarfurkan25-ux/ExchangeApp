export const validateEmail = (email: string): boolean => {
    // Standard basic email regex
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

export const validatePasswordStrength = (password: string): { isValid: boolean, message: string } => {
    if (!password) {
        return { isValid: false, message: 'Şifre alanı boş bırakılamaz.' };
    }

    if (password.length < 6) {
        return { isValid: false, message: 'Şifre en az 6 karakter olmalıdır.' };
    }

    /* As user already has legacy users with maybe simple passwords, we shouldn't force insane complexity,
       but enforcing at least one letter and one number is decent baseline */
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasLetter || !hasNumber) {
        return { isValid: false, message: 'Şifre en az bir harf ve bir rakam içermelidir.' };
    }

    return { isValid: true, message: 'Geçerli' };
};
