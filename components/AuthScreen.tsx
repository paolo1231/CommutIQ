import { showAlert, showErrorAlert } from '@/utils/alertHelper';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { UI_CONFIG } from '../constants';
import { supabaseService } from '../services/supabaseService';
import AuthValidation from '../utils/authValidation';

interface AuthScreenProps {
  onAuthSuccess: (userId: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form validation states
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);

  // Password strength indicator
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: [] as string[],
    color: '#ef4444'
  });

  // Validate form whenever inputs change
  useEffect(() => {
    validateForm();
  }, [email, password, confirmPassword, isLogin]);

  // Update password strength when password changes
  useEffect(() => {
    if (!isLogin && password) {
      const strength = AuthValidation.getPasswordStrengthFeedback(password);
      setPasswordStrength(strength);
    }
  }, [password, isLogin]);

  const validateForm = () => {
    let emailErr = '';
    let passwordErr = '';
    let confirmPasswordErr = '';
    let valid = true;

    // Validate email
    if (email) {
      const emailValidation = AuthValidation.validateEmail(email);
      if (!emailValidation.isValid) {
        emailErr = emailValidation.error || '';
        valid = false;
      }
    }

    // Validate password
    if (password) {
      const passwordValidation = AuthValidation.validatePassword(password, !isLogin);
      if (!passwordValidation.isValid) {
        passwordErr = passwordValidation.error || '';
        valid = false;
      }
    }

    // Validate confirm password for signup
    if (!isLogin && password && confirmPassword) {
      const confirmValidation = AuthValidation.validatePasswordConfirmation(password, confirmPassword);
      if (!confirmValidation.isValid) {
        confirmPasswordErr = confirmValidation.error || '';
        valid = false;
      }
    }

    // Check if all required fields are filled
    if (!email || !password || (!isLogin && !confirmPassword)) {
      valid = false;
    }

    setEmailError(emailErr);
    setPasswordError(passwordErr);
    setConfirmPasswordError(confirmPasswordErr);
    setIsFormValid(valid);
  };

  const handleAuth = async () => {
    if (!isFormValid) return;

    setLoading(true);

    try {
      if (isLogin) {
        const result = await supabaseService.signIn(email.trim(), password);

        if (result.error) {
          const errorMessage = AuthValidation.getAuthErrorMessage(result.error);
          setLoading(false);
          showErrorAlert(errorMessage);
          return;
        }

        if (result.data?.user) {
          // Check if user profile exists, create if it doesn't
          const profileResult = await supabaseService.getUserProfile(result.data.user.id);

          if (profileResult.error || !profileResult.data) {
            // Profile doesn't exist, create it
            const createProfileResult = await supabaseService.createUserProfile(result.data.user.id, {
              commute_time: 30,
              subscription_tier: 'free',
              last_active_at: new Date().toISOString(),
              preferences: {
                audioSpeed: 1.0,
                autoPlay: true,
                downloadQuality: 'standard',
                notificationsEnabled: true,
                backgroundPlayback: true,
              },
            });

            if (createProfileResult.error) {
              setLoading(false);
              showErrorAlert('Failed to set up your profile. Please try again.');
              return;
            }
          }

          setLoading(false);
          onAuthSuccess(result.data.user.id);
          return; // Prevent finally block from executing
        }
      } else {
        const result = await supabaseService.signUp(email.trim(), password);

        if (result.error) {
          const errorMessage = AuthValidation.getAuthErrorMessage(result.error);
          setLoading(false);
          showErrorAlert(errorMessage);
          return;
        }

        console.log('Signup result:', result); // Debug log

        // Set loading to false before showing alert
        setLoading(false);

        // Switch to login mode and show success message
        console.log('Switching to login mode'); // Debug log
        setIsLogin(true);

        // Show email verification message
        setTimeout(() => {
          showAlert({
            title: 'Check Your Email',
            message: 'Please check your email for a confirmation link before signing in.'
          });
        }, 100);
        return; // Prevent finally block from executing
      }
    } catch (error) {
      console.error('Auth error:', error);
      showErrorAlert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchMode = () => {
    setIsLogin(!isLogin);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);

    // Clear validation errors
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
  };

  const renderPasswordStrengthIndicator = () => {
    if (isLogin || !password) return null;

    return (
      <View style={styles.passwordStrengthContainer}>
        <View style={styles.passwordStrengthBar}>
          <View
            style={[
              styles.passwordStrengthFill,
              {
                width: `${(passwordStrength.score / 5) * 100}%`,
                backgroundColor: passwordStrength.color,
              }
            ]}
          />
        </View>
        {passwordStrength.feedback.length > 0 && (
          <Text style={styles.passwordStrengthText}>
            Password needs: {passwordStrength.feedback.join(', ')}
          </Text>
        )}
      </View>
    );
  };

  const renderErrorMessage = (error: string) => {
    if (!error) return null;
    return <Text style={styles.fieldError}>{error}</Text>;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoBackground}>
                <Ionicons name="book-outline" size={32} color={UI_CONFIG.COLORS.PRIMARY} />
              </View>
              <Text style={styles.logoText}>CommutIQ</Text>
            </View>

            <Text style={styles.title}>
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin
                ? 'Sign in to continue your learning journey'
                : 'Join thousands of learners transforming their commute'
              }
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[
                styles.inputContainer,
                emailError ? styles.inputContainerError : null
              ]}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={emailError ? UI_CONFIG.COLORS.ERROR : UI_CONFIG.COLORS.GRAY_400}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="next"
                />
              </View>
              {renderErrorMessage(emailError)}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[
                styles.inputContainer,
                passwordError ? styles.inputContainerError : null
              ]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={passwordError ? UI_CONFIG.COLORS.ERROR : UI_CONFIG.COLORS.GRAY_400}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                  returnKeyType={isLogin ? "done" : "next"}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.passwordToggle}
                  disabled={loading}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={UI_CONFIG.COLORS.GRAY_400}
                  />
                </TouchableOpacity>
              </View>
              {renderErrorMessage(passwordError)}
              {renderPasswordStrengthIndicator()}
            </View>

            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={[
                  styles.inputContainer,
                  confirmPasswordError ? styles.inputContainerError : null
                ]}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={confirmPasswordError ? UI_CONFIG.COLORS.ERROR : UI_CONFIG.COLORS.GRAY_400}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm your password"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    editable={!loading}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.passwordToggle}
                    disabled={loading}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color={UI_CONFIG.COLORS.GRAY_400}
                    />
                  </TouchableOpacity>
                </View>
                {renderErrorMessage(confirmPasswordError)}
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.authButton,
                (!isFormValid || loading) && styles.authButtonDisabled
              ]}
              onPress={handleAuth}
              disabled={!isFormValid || loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.authButtonText}>
                  {isLogin ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
              </Text>
              <TouchableOpacity onPress={handleSwitchMode} disabled={loading}>
                <Text style={styles.switchLink}>
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.disclaimer}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.COLORS.BACKGROUND,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: UI_CONFIG.SPACING.LG,
    paddingTop: 60,
    paddingBottom: UI_CONFIG.SPACING.LG,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: UI_CONFIG.SPACING.XXL,
  },
  logoBackground: {
    backgroundColor: '#eef2ff',
    borderRadius: UI_CONFIG.BORDER_RADIUS.XL * 2,
    padding: UI_CONFIG.SPACING.MD,
    marginBottom: UI_CONFIG.SPACING.SM,
  },
  logoText: {
    fontSize: UI_CONFIG.FONT_SIZES.XXL,
    fontWeight: 'bold',
    color: UI_CONFIG.COLORS.PRIMARY,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: UI_CONFIG.SPACING.SM,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: UI_CONFIG.FONT_SIZES.MD,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: UI_CONFIG.SPACING.LG,
  },
  label: {
    fontSize: UI_CONFIG.FONT_SIZES.SM,
    fontWeight: '600',
    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: UI_CONFIG.SPACING.SM,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
    borderRadius: UI_CONFIG.BORDER_RADIUS.LG,
    borderWidth: 1,
    borderColor: UI_CONFIG.COLORS.GRAY_200,
    paddingHorizontal: UI_CONFIG.SPACING.SM,
    height: 48,
  },
  inputContainerError: {
    borderColor: UI_CONFIG.COLORS.ERROR,
    borderWidth: 2,
  },
  inputIcon: {
    marginRight: UI_CONFIG.SPACING.SM,
  },
  input: {
    flex: 1,
    fontSize: UI_CONFIG.FONT_SIZES.MD,
    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
    paddingVertical: 0,
  },
  passwordToggle: {
    padding: UI_CONFIG.SPACING.XS,
  },
  fieldError: {
    fontSize: UI_CONFIG.FONT_SIZES.SM,
    color: UI_CONFIG.COLORS.ERROR,
    marginTop: UI_CONFIG.SPACING.XS,
    marginLeft: UI_CONFIG.SPACING.XS,
  },
  passwordStrengthContainer: {
    marginTop: UI_CONFIG.SPACING.SM,
  },
  passwordStrengthBar: {
    height: 4,
    backgroundColor: UI_CONFIG.COLORS.GRAY_200,
    borderRadius: 2,
    overflow: 'hidden',
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: UI_CONFIG.FONT_SIZES.XS,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    marginTop: UI_CONFIG.SPACING.XS,
  },
  authButton: {
    backgroundColor: UI_CONFIG.COLORS.PRIMARY,
    borderRadius: UI_CONFIG.BORDER_RADIUS.LG,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: UI_CONFIG.SPACING.LG,
    ...UI_CONFIG.SHADOWS.SM,
  },
  authButtonDisabled: {
    backgroundColor: UI_CONFIG.COLORS.GRAY_400,
  },
  authButtonText: {
    color: UI_CONFIG.COLORS.TEXT_ON_PRIMARY,
    fontSize: UI_CONFIG.FONT_SIZES.MD,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: UI_CONFIG.SPACING.MD,
  },
  switchText: {
    fontSize: UI_CONFIG.FONT_SIZES.SM,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
  },
  switchLink: {
    fontSize: UI_CONFIG.FONT_SIZES.SM,
    color: UI_CONFIG.COLORS.PRIMARY,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: UI_CONFIG.FONT_SIZES.XS,
    color: UI_CONFIG.COLORS.TEXT_DISABLED,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: UI_CONFIG.SPACING.LG,
  },
});