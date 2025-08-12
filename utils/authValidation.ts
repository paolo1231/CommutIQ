import { ERROR_MESSAGES, VALIDATION_RULES } from '../constants';

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

export interface FormValidationResult {
    isValid: boolean;
    errors: {
        email?: string;
        password?: string;
        confirmPassword?: string;
        general?: string;
    };
}

export class AuthValidation {
    /**
     * Validate email address
     */
    static validateEmail(email: string): ValidationResult {
        if (!email || !email.trim()) {
            return {
                isValid: false,
                error: ERROR_MESSAGES.AUTH.EMAIL_REQUIRED,
            };
        }

        const trimmedEmail = email.trim();

        if (trimmedEmail.length > VALIDATION_RULES.AUTH.EMAIL_MAX_LENGTH) {
            return {
                isValid: false,
                error: 'Email address is too long.',
            };
        }

        if (!VALIDATION_RULES.EMAIL.test(trimmedEmail)) {
            return {
                isValid: false,
                error: ERROR_MESSAGES.AUTH.INVALID_EMAIL,
            };
        }

        return { isValid: true };
    }

    /**
     * Validate password strength
     */
    static validatePassword(password: string, requireStrong: boolean = false): ValidationResult {
        if (!password) {
            return {
                isValid: false,
                error: ERROR_MESSAGES.AUTH.PASSWORD_REQUIRED,
            };
        }

        if (password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
            return {
                isValid: false,
                error: ERROR_MESSAGES.AUTH.PASSWORD_TOO_SHORT,
            };
        }

        if (password.length > VALIDATION_RULES.AUTH.PASSWORD_MAX_LENGTH) {
            return {
                isValid: false,
                error: 'Password is too long.',
            };
        }

        if (requireStrong && !VALIDATION_RULES.PASSWORD_STRONG.test(password)) {
            return {
                isValid: false,
                error: ERROR_MESSAGES.AUTH.PASSWORD_TOO_WEAK,
            };
        }

        return { isValid: true };
    }

    /**
     * Validate password confirmation
     */
    static validatePasswordConfirmation(password: string, confirmPassword: string): ValidationResult {
        if (!confirmPassword) {
            return {
                isValid: false,
                error: 'Please confirm your password.',
            };
        }

        if (password !== confirmPassword) {
            return {
                isValid: false,
                error: ERROR_MESSAGES.AUTH.PASSWORDS_DONT_MATCH,
            };
        }

        return { isValid: true };
    }

    /**
     * Validate sign-in form
     */
    static validateSignInForm(email: string, password: string): FormValidationResult {
        const errors: FormValidationResult['errors'] = {};
        let isValid = true;

        // Validate email
        const emailValidation = this.validateEmail(email);
        if (!emailValidation.isValid) {
            errors.email = emailValidation.error;
            isValid = false;
        }

        // Validate password (basic validation for sign-in)
        const passwordValidation = this.validatePassword(password, false);
        if (!passwordValidation.isValid) {
            errors.password = passwordValidation.error;
            isValid = false;
        }

        return { isValid, errors };
    }

    /**
     * Validate sign-up form
     */
    static validateSignUpForm(
        email: string,
        password: string,
        confirmPassword: string,
        requireStrongPassword: boolean = true
    ): FormValidationResult {
        const errors: FormValidationResult['errors'] = {};
        let isValid = true;

        // Validate email
        const emailValidation = this.validateEmail(email);
        if (!emailValidation.isValid) {
            errors.email = emailValidation.error;
            isValid = false;
        }

        // Validate password (strong validation for sign-up)
        const passwordValidation = this.validatePassword(password, requireStrongPassword);
        if (!passwordValidation.isValid) {
            errors.password = passwordValidation.error;
            isValid = false;
        }

        // Validate password confirmation
        const confirmPasswordValidation = this.validatePasswordConfirmation(password, confirmPassword);
        if (!confirmPasswordValidation.isValid) {
            errors.confirmPassword = confirmPasswordValidation.error;
            isValid = false;
        }

        return { isValid, errors };
    }

    /**
     * Get user-friendly error message from Supabase error
     */
    static getAuthErrorMessage(error: any): string {
        if (!error) return ERROR_MESSAGES.UNKNOWN_ERROR;

        const errorMessage = error.message || error.error_description || '';
        const errorCode = error.error || error.code || '';

        // Map common Supabase auth errors to user-friendly messages
        if (errorMessage.includes('Invalid login credentials') ||
            errorMessage.includes('Invalid email or password')) {
            return ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS;
        }

        if (errorMessage.includes('Email not confirmed') ||
            errorCode === 'email_not_confirmed') {
            return ERROR_MESSAGES.AUTH.EMAIL_NOT_CONFIRMED;
        }

        if (errorMessage.includes('User already registered') ||
            errorCode === 'user_already_exists') {
            return ERROR_MESSAGES.AUTH.EMAIL_ALREADY_EXISTS;
        }

        if (errorMessage.includes('User not found') ||
            errorCode === 'user_not_found') {
            return ERROR_MESSAGES.AUTH.USER_NOT_FOUND;
        }

        if (errorMessage.includes('Too many requests') ||
            errorCode === 'too_many_requests') {
            return ERROR_MESSAGES.AUTH.TOO_MANY_ATTEMPTS;
        }

        if (errorMessage.includes('Password is too weak') ||
            errorCode === 'weak_password') {
            return ERROR_MESSAGES.AUTH.WEAK_PASSWORD;
        }

        if (errorMessage.includes('Signups not allowed') ||
            errorCode === 'signup_disabled') {
            return ERROR_MESSAGES.AUTH.SIGNUP_DISABLED;
        }

        if (errorMessage.includes('Email rate limit exceeded') ||
            errorCode === 'email_rate_limit_exceeded') {
            return ERROR_MESSAGES.AUTH.EMAIL_RATE_LIMIT;
        }

        if (errorMessage.includes('Invalid token') ||
            errorCode === 'invalid_token') {
            return ERROR_MESSAGES.AUTH.INVALID_TOKEN;
        }

        if (errorMessage.includes('JWT expired') ||
            errorCode === 'token_expired') {
            return ERROR_MESSAGES.AUTH.SESSION_EXPIRED;
        }

        if (errorMessage.includes('Network request failed') ||
            errorCode === 'network_error') {
            return ERROR_MESSAGES.NETWORK_ERROR;
        }

        // Return the original error message if we can't map it
        return errorMessage || ERROR_MESSAGES.UNKNOWN_ERROR;
    }

    /**
     * Check password strength and return feedback
     */
    static getPasswordStrengthFeedback(password: string): {
        score: number; // 0-4 (weak to very strong)
        feedback: string[];
        color: string;
    } {
        const feedback: string[] = [];
        let score = 0;

        if (password.length >= VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
            score += 1;
        } else {
            feedback.push(`At least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`);
        }

        if (/[a-z]/.test(password)) {
            score += 1;
        } else {
            feedback.push('One lowercase letter');
        }

        if (/[A-Z]/.test(password)) {
            score += 1;
        } else {
            feedback.push('One uppercase letter');
        }

        if (/\d/.test(password)) {
            score += 1;
        } else {
            feedback.push('One number');
        }

        if (/[@$!%*?&]/.test(password)) {
            score += 1;
        } else {
            feedback.push('One special character (@$!%*?&)');
        }

        // Determine color based on score
        let color = '#ef4444'; // red - weak
        if (score >= 4) color = '#10b981'; // green - strong
        else if (score >= 3) color = '#f59e0b'; // yellow - medium
        else if (score >= 2) color = '#f97316'; // orange - fair

        return { score, feedback, color };
    }

    /**
     * Sanitize email input
     */
    static sanitizeEmail(email: string): string {
        return email.trim().toLowerCase();
    }

    /**
     * Check if email domain is commonly used (for additional validation)
     */
    static isCommonEmailDomain(email: string): boolean {
        const commonDomains = [
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
            'icloud.com', 'aol.com', 'protonmail.com', 'mail.com'
        ];

        const domain = email.split('@')[1]?.toLowerCase();
        return commonDomains.includes(domain);
    }
}

export default AuthValidation;