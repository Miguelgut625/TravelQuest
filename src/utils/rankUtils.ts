import { StyleSheet } from 'react-native';
import { colors, typography } from '../styles/theme';

export function getRankTitle(rankIndex?: number) {
    if (rankIndex === 0) return '🏆 Explorador Supremo';
    if (rankIndex === 1) return '🌍 Aventurero Global';
    if (rankIndex === 2) return '✈️ Viajero Frecuente';
    if (rankIndex !== undefined && rankIndex > 2 && rankIndex < 10) return '🌍 Viajero Experto';
    return '';
}

export function getRankTitleStyle(rankIndex?: number) {
    if (rankIndex === 0) return styles.firstPlaceText;
    if (rankIndex === 1) return styles.secondPlaceText;
    if (rankIndex === 2) return styles.thirdPlaceText;
    if (rankIndex !== undefined && rankIndex > 2 && rankIndex < 10) return styles.titleText;
    return undefined;
}

const styles = StyleSheet.create({
    firstPlaceText: {
        color: '#FFD700',
        ...typography.body,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 5,
    },
    secondPlaceText: {
        color: '#C0C0C0',
        ...typography.body,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 5,
    },
    thirdPlaceText: {
        color: '#CD7F32',
        ...typography.body,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 5,
    },
    titleText: {
        color: colors.primary,
        ...typography.body,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 5,
    },
}); 