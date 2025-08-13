import { Alert, Platform } from 'react-native';

/**
 * Alert Helper Utility
 * 
 * Provides platform-agnostic alert functionality that works on both web and mobile.
 * 
 * Usage Examples:
 * 
 * // Simple success message
 * showSuccessAlert('Profile updated successfully!');
 * 
 * // Simple error message
 * showErrorAlert('Failed to save changes. Please try again.');
 * 
 * // Confirmation dialog
 * showConfirmAlert(
 *   'Delete Item',
 *   'Are you sure you want to delete this item?',
 *   () => console.log('Confirmed'),
 *   () => console.log('Cancelled')
 * );
 * 
 * // Destructive action
 * showDestructiveAlert(
 *   'Delete Account',
 *   'This action cannot be undone.',
 *   'Delete',
 *   () => deleteAccount(),
 *   () => console.log('Cancelled')
 * );
 * 
 * // Custom alert with multiple buttons
 * showAlert({
 *   title: 'Save Changes',
 *   message: 'You have unsaved changes. What would you like to do?',
 *   buttons: [
 *     { text: 'Cancel', style: 'cancel' },
 *     { text: 'Discard', style: 'destructive', onPress: () => discardChanges() },
 *     { text: 'Save', onPress: () => saveChanges() }
 *   ]
 * });
 */

export interface AlertOptions {
    title: string;
    message: string;
    buttons?: Array<{
        text: string;
        onPress?: () => void;
        style?: 'default' | 'cancel' | 'destructive';
    }>;
}

/**
 * Platform-agnostic alert helper
 * Uses native Alert on mobile and window.alert on web
 */
export const showAlert = (options: AlertOptions): void => {
    const { title, message, buttons = [{ text: 'OK' }] } = options;

    if (Platform.OS === 'web') {
        // Web implementation using window.alert
        const fullMessage = title ? `${title}\n\n${message}` : message;
        window.alert(fullMessage);

        // Execute the first button's onPress callback if it exists
        if (buttons[0]?.onPress) {
            buttons[0].onPress();
        }
    } else {
        // Native mobile implementation
        Alert.alert(title, message, buttons);
    }
};

/**
 * Show a simple success alert
 */
export const showSuccessAlert = (message: string, onPress?: () => void): void => {
    showAlert({
        title: 'Success',
        message,
        buttons: [{ text: 'OK', onPress }]
    });
};

/**
 * Show a simple error alert
 */
export const showErrorAlert = (message: string, onPress?: () => void): void => {
    showAlert({
        title: 'Error',
        message,
        buttons: [{ text: 'OK', onPress }]
    });
};

/**
 * Show a confirmation alert with Yes/No buttons
 */
export const showConfirmAlert = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
): void => {
    showAlert({
        title,
        message,
        buttons: [
            { text: 'Cancel', style: 'cancel', onPress: onCancel },
            { text: 'Yes', onPress: onConfirm }
        ]
    });
};

/**
 * Show a destructive confirmation alert (for delete actions, etc.)
 */
export const showDestructiveAlert = (
    title: string,
    message: string,
    destructiveText: string,
    onConfirm: () => void,
    onCancel?: () => void
): void => {
    showAlert({
        title,
        message,
        buttons: [
            { text: 'Cancel', style: 'cancel', onPress: onCancel },
            { text: destructiveText, style: 'destructive', onPress: onConfirm }
        ]
    });
};