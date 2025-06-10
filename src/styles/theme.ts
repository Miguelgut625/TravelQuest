import { StyleSheet, Dimensions } from 'react-native';

// Paleta de colores profesional para una app de viajes
export const lightColors = {
  primary: '#2B6CB0',      // Azul profundo y confiable
  secondary: '#38A169',    // Verde naturaleza
  accent: '#D69E2E',       // Dorado cálido
  background: '#F7FAFC',   // Fondo claro suave
  surface: '#F7FAFC',      // Superficie gris muy claro
  text: {
    primary: '#1A202C',    // Texto principal oscuro
    secondary: '#4A5568',  // Texto secundario
    light: '#718096',      // Texto claro
  },
  border: '#E2E8F0',       // Bordes suaves
  success: '#48BB78',      // Verde éxito
  error: '#E53E3E',        // Rojo error
  warning: '#ED8936',      // Naranja advertencia
  info: '#4299E1',         // Azul información
  divider: '#EDF2F7',      // Divisores
  overlay: 'rgba(0,0,0,0.5)', // Overlay para modales
  eventBackground: '#FFF3CD', // Fondo para misiones de evento
  eventBorder: '#FFD700',     // Borde dorado para evento
  eventText: '#B8860B',       // Texto dorado evento
  shareIcon: '#005F9E',       // Azul para icono compartir
  hintIcon: '#FFB900',        // Amarillo para icono pista
  dividerAlt: '#E0E0E0',      // Alternativa para divisores
  warningCard: '#FFB74D',     // Naranja para tarjetas de advertencia
  white: '#FFFFFF',           // Blanco puro
};

export const darkColors = {
  primary: '#4299E1',      // Azul más brillante para modo oscuro
  secondary: '#48BB78',    // Verde más vibrante
  accent: '#F6AD55',       // Dorado más claro
  background: '#1A202C',   // Fondo oscuro
  surface: '#2D3748',      // Superficie oscura
  text: {
    primary: '#F7FAFC',    // Texto principal claro
    secondary: '#E2E8F0',  // Texto secundario
    light: '#A0AEC0',      // Texto claro
  },
  border: '#4A5568',       // Bordes oscuros
  success: '#68D391',      // Verde éxito más claro
  error: '#FC8181',        // Rojo error más claro
  warning: '#F6AD55',      // Naranja advertencia más claro
  info: '#63B3ED',         // Azul información más claro
  divider: '#2D3748',      // Divisores oscuros
  overlay: 'rgba(0,0,0,0.7)', // Overlay más oscuro
  eventBackground: '#4B3F1B', // Fondo evento oscuro
  eventBorder: '#FFD700',     // Borde dorado para evento
  eventText: '#FFD700',       // Texto dorado evento
  shareIcon: '#63B3ED',       // Azul claro para icono compartir
  hintIcon: '#F6AD55',        // Amarillo para icono pista
  dividerAlt: '#2D3748',      // Alternativa para divisores oscuros
  warningCard: '#F6AD55',     // Naranja para tarjetas de advertencia
  white: '#FFFFFF',           // Blanco puro
};

// Exportar los colores activos (se actualizarán según el tema)
export let colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
  },
};

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

export const borderRadius = {
  small: 4,
  medium: 8,
  large: 12,
  xl: 16,
  round: 9999,
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    ...shadows.medium,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },
  buttonText: {
    color: colors.surface,
    ...typography.body,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    color: colors.text.primary,
    ...typography.body,
    marginTop: spacing.sm,
  },
  errorContainer: {
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: colors.error,
    ...typography.body,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.text.primary,
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.large,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    ...shadows.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingBottom: spacing.sm,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  modalBody: {
    padding: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  listItemSubtitle: {
    ...typography.small,
    color: colors.text.secondary,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.h2,
    color: colors.surface,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: colors.surface,
    ...typography.small,
    fontWeight: '600',
  },
  section: {
    margin: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    ...shadows.medium,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Estilos específicos para el carrusel de JournalScreen
export const carouselStyles = StyleSheet.create({
  container: {
    height: 200,
    marginBottom: spacing.md,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.medium,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    borderRadius: borderRadius.medium,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  cityName: {
    color: colors.surface,
    ...typography.h2,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  navButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.round,
    padding: spacing.sm,
  },
});

export const motivationalButton = {
  backgroundColor: colors.accent,
  borderRadius: borderRadius.xl,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.xl,
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
  ...shadows.large,
  elevation: 8,
  width: 260,
  minHeight: 60,
};

export const motivationalButtonText = {
  color: colors.surface,
  ...typography.h2,
  fontWeight: 'bold',
  textAlign: 'center',
  flex: 1,
};

export const motivationalButtonSubtitle = {
  color: colors.surface,
  ...typography.body,
  textAlign: 'center',
  opacity: 0.85,
  marginTop: spacing.xs,
};

export const mapContainer = {
  flex: 1,
  position: 'relative',
  backgroundColor: colors.background,
};

export const missionFormWrapper = {
  position: 'absolute',
  top: 90,
  left: 0,
  right: 0,
  alignItems: 'center',
  zIndex: 30,
};

export const missionFormCard = {
  width: '95%',
  maxWidth: 400,
  backgroundColor: 'rgba(255,255,255,0.97)',
  borderRadius: borderRadius.xl,
  padding: spacing.lg,
  ...shadows.large,
};

export const missionFormScroll = {
  maxHeight: 520,
};

export const missionInputRow = {
  flexDirection: 'row',
  marginBottom: spacing.md,
};

export const missionInput = {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.background,
  borderRadius: borderRadius.medium,
  borderWidth: 1,
  borderColor: colors.border,
  marginRight: spacing.sm,
  ...shadows.small,
};

export const missionTextInput = {
  flex: 1,
  backgroundColor: 'transparent',
  color: colors.text.primary,
  fontSize: 16,
  paddingVertical: spacing.sm,
};

export const missionTagsRow = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'center',
  marginBottom: spacing.md,
};

export const missionTag = {
  borderRadius: borderRadius.round,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
  marginRight: spacing.xs,
  marginBottom: spacing.xs,
  borderWidth: 1,
  maxWidth: 110,
};

export const missionTagText = {
  ...typography.small,
  numberOfLines: 1,
  ellipsizeMode: 'tail',
};

export const missionOrderButton = {
  flexDirection: 'row',
  alignItems: 'center',
  borderRadius: borderRadius.medium,
  padding: spacing.sm,
  borderWidth: 1,
  marginBottom: spacing.md,
  justifyContent: 'center',
};

export const missionGenerateButton = {
  flexDirection: 'row',
  borderRadius: borderRadius.medium,
  paddingVertical: spacing.md,
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: spacing.md,
  marginBottom: spacing.sm,
  ...shadows.small,
};

export const fabButton = {
  backgroundColor: colors.accent,
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
  alignItems: 'center',
  justifyContent: 'center',
  elevation: 6,
};

export const fabButtonIcon = {
  color: colors.surface,
  fontSize: 28,
};

export const fabContainer = {
  position: 'absolute',
  bottom: 32 + 56,
  right: 24,
  zIndex: 10,
};

export const overlayLoading = {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(0,0,0,0.3)',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 100,
};

// Estilos dinámicos para CreateMissionScreen
export function getCreateMissionStyles(colors, isDarkMode) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#101828' : colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      backgroundColor: isDarkMode ? colors.background : colors.primary,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? colors.background : colors.primary,
      ...shadows.small,
    },
    backButton: {
      position: 'absolute',
      left: spacing.md,
      top: '50%',
      marginTop: -18,
      zIndex: 2,
      backgroundColor: isDarkMode ? '#101828' : colors.primary,
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.small,
    },
    backButtonText: {
      display: 'none',
    },
    title: {
      ...typography.h2,
      color: isDarkMode ? colors.accent : colors.surface,
      textAlign: 'center',
      flex: 1,
    },
    formContainer: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#101828' : colors.background,
      paddingTop: spacing.xl,
    },
    formCard: {
      width: '95%',
      maxWidth: 400,
      backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: isDarkMode ? colors.border : '#E2E8F0',
      ...(isDarkMode ? {} : shadows.large),
    },
    fieldGroup: {
      marginBottom: spacing.xl,
    },
    fieldLabel: {
      ...typography.body,
      color: isDarkMode ? colors.accent : colors.text.primary,
      marginBottom: spacing.xs,
      fontWeight: 'bold',
    },
    input: {
      backgroundColor: isDarkMode ? '#232B3A' : colors.surface,
      borderRadius: borderRadius.large,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: isDarkMode ? colors.border : colors.border,
      color: isDarkMode ? colors.text.primary : colors.text.primary,
      ...shadows.small,
    },
    suggestionsDropdown: {
      position: 'absolute',
      top: 60,
      left: 0,
      right: 0,
      backgroundColor: isDarkMode ? colors.surface : '#FFF',
      borderRadius: borderRadius.medium,
      ...shadows.medium,
      zIndex: 10,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: 180,
    },
    suggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    suggestionText: {
      ...typography.body,
      color: isDarkMode ? colors.accent : colors.text.primary,
      marginLeft: spacing.sm,
    },
    locationIcon: {
      color: isDarkMode ? colors.accent : colors.primary,
    },
    difficultyContainer: {
      marginBottom: spacing.xl,
    },
    label: {
      ...typography.body,
      marginBottom: spacing.sm,
      color: isDarkMode ? colors.accent : colors.text.primary,
    },
    difficultyButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    difficultyButton: {
      flex: 1,
      marginHorizontal: spacing.xs,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDarkMode ? colors.accent : colors.primary,
      backgroundColor: isDarkMode ? '#101828' : colors.background,
      elevation: 0,
    },
    difficultyButtonActive: {
      backgroundColor: isDarkMode ? colors.accent : colors.primary,
      borderColor: isDarkMode ? colors.accent : colors.primary,
    },
    difficultyButtonText: {
      color: isDarkMode ? colors.accent : colors.primary,
      fontWeight: 'bold',
      textTransform: 'capitalize',
    },
    difficultyButtonTextActive: {
      color: isDarkMode ? '#181C22' : colors.surface,
    },
    submitButton: {
      marginTop: spacing.xl,
      backgroundColor: isDarkMode ? colors.accent : colors.primary,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.md,
      ...shadows.medium,
    },
    submitButtonText: {
      color: isDarkMode ? '#181C22' : colors.surface,
      ...typography.h3,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    dateCard: {
      backgroundColor: isDarkMode ? '#232B3A' : colors.surface,
      borderRadius: borderRadius.large,
      borderWidth: 1,
      borderColor: isDarkMode ? colors.border : colors.border,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      ...shadows.small,
    },
    dateCardText: {
      color: isDarkMode ? colors.accent : colors.text.primary,
      fontWeight: 'bold',
      marginLeft: spacing.md,
    },
    dateCardSub: {
      color: isDarkMode ? colors.text.secondary : colors.text.secondary,
      marginLeft: spacing.md,
    },
  });
}

// Estilos dinámicos para FriendsScreen
export function getFriendsScreenStyles(colors, isDarkMode, width) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? colors.background : colors.background,
      paddingHorizontal: width < 400 ? 6 : 16,
    },
    safeArea: {
      flex: 1,
      backgroundColor: isDarkMode ? colors.background : colors.background,
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      backgroundColor: isDarkMode ? colors.background : colors.primary,
      paddingHorizontal: width < 400 ? 8 : 16,
      marginTop: 10,
    },
    headerTitleContainer: {
      flex: 1,
      alignItems: 'center',
    },
    title: {
      fontSize: width < 400 ? 20 : 24,
      fontWeight: 'bold',
      color: '#FFFFFF',
      textAlign: 'center',
      marginBottom: 8,
    },
    backButton: {
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
      shadowColor: 'transparent',
      elevation: 0,
    },
    rightSpace: {
      width: 32,
    },
    searchInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
      marginBottom: 4,
      marginHorizontal: width < 400 ? 8 : 16,
    },
    searchInfoText: {
      color: colors.text.light,
      fontSize: width < 400 ? 12 : 14,
    },
    searchContainer: {
      backgroundColor: isDarkMode ? colors.surface : colors.surface,
      borderRadius: 12,
      padding: width < 400 ? 10 : 16,
      margin: width < 400 ? 8 : 16,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      marginBottom: 8,
    },
    searchIcon: {
      marginRight: 8,
      color: colors.text.secondary,
    },
    searchInput: {
      flex: 1,
      backgroundColor: 'transparent',
      borderWidth: 0,
      fontSize: 16,
      color: colors.text.primary,
      paddingVertical: 10,
    },
    clearButton: {
      marginLeft: 8,
    },
    searchResultsContainer: {
      backgroundColor: colors.background,
      borderRadius: 8,
      marginTop: 8,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      padding: 8,
    },
    searchResultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchResultContent: {
      flex: 1,
    },
    searchResultHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2,
    },
    searchResultUsername: {
      fontSize: 16,
      color: colors.text.primary,
      fontWeight: 'bold',
    },
    friendBadge: {
      backgroundColor: isDarkMode ? colors.accent : colors.primary,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
      marginLeft: 8,
    },
    friendBadgeText: {
      color: isDarkMode ? colors.background : colors.white,
      fontSize: 12,
      fontWeight: 'bold',
    },
    searchResultPoints: {
      fontSize: 14,
      color: colors.text.secondary,
    },
    addFriendButton: {
      marginLeft: 8,
    },
    noResultsText: {
      color: colors.text.secondary,
      fontSize: 14,
      textAlign: 'center',
      marginTop: 8,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: width < 400 ? 10 : 16,
      marginHorizontal: width < 400 ? 8 : 16,
      marginVertical: 8,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: width < 400 ? 18 : 24,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : colors.primary,
    },
    statLabel: {
      fontSize: width < 400 ? 12 : 14,
      color: colors.text.secondary,
      marginTop: 4,
    },
    tabsContainer: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 4,
      marginHorizontal: width < 400 ? 8 : 16,
      marginBottom: 16,
    },
    tab: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 6,
    },
    activeTab: {
      backgroundColor: isDarkMode ? colors.accent : colors.primary,
      borderWidth: 2,
      borderColor: isDarkMode ? colors.accent : colors.primary,
    },
    tabText: {
      fontSize: 16,
      color: isDarkMode ? colors.text.primary : colors.primary,
    },
    activeTabText: {
      color: isDarkMode ? '#181C22' : '#FFFFFF',
      fontWeight: 'bold',
    },
    friendItem: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: width < 400 ? 10 : 16,
      marginHorizontal: width < 400 ? 4 : 16,
      marginVertical: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: isDarkMode ? colors.accent : 'transparent',
    },
    friendInfo: {
      flex: 1,
    },
    friendName: {
      fontSize: width < 400 ? 14 : 16,
      fontWeight: 'bold',
      color: colors.text.primary,
      marginBottom: 4,
    },
    friendPoints: {
      fontSize: 14,
      color: colors.text.secondary,
    },
    actionsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButton: {
      padding: 8,
      borderRadius: 8,
      marginLeft: 8,
    },
    acceptButton: {
      backgroundColor: colors.success,
    },
    rejectButton: {
      backgroundColor: colors.error,
    },
    actionButtonText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: '600',
    },
    badgeContainer: {
      position: 'absolute',
      top: 0,
      right: 0,
      backgroundColor: colors.error,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    badgeText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: 'bold',
    },
    requestItem: {
      padding: width < 400 ? 10 : 15,
      marginVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    requestInfo: {
      flex: 1,
    },
    requestUsername: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
    },
    requestDate: {
      fontSize: 14,
      color: colors.text.secondary,
      marginTop: 4,
    },
    requestActions: {
      flexDirection: 'row',
      gap: 10,
    },
    requestButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: colors.accent,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 30,
    },
    emptyText: {
      fontSize: 16,
      color: isDarkMode ? colors.text.secondary : '#444',
      textAlign: 'center',
      lineHeight: 24,
    },
    requestsContainer: {
      flex: 1,
    },
    requestTabsContainer: {
      flexDirection: 'row',
      marginBottom: 15,
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    requestTab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 8,
    },
    activeRequestTab: {
      backgroundColor: isDarkMode ? colors.accent : colors.primary,
    },
    requestTabText: {
      fontSize: 14,
      color: isDarkMode ? colors.text.secondary : colors.primary,
    },
    activeRequestTabText: {
      color: isDarkMode ? '#181C22' : '#FFFFFF',
      fontWeight: 'bold',
    },
    requestsList: {
      flex: 1,
    },
  });
}

// Estilos dinámicos para FriendProfileScreen
export function getFriendProfileScreenStyles(colors, isDarkMode, width) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? colors.background : '#f5f5f5',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerBackground: {
      backgroundColor: isDarkMode ? colors.background : colors.primary,
      padding: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      marginRight: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : colors.surface,
      marginRight: 6,
    },
    profileSection: {
      alignItems: 'center',
      padding: 20,
      backgroundColor: isDarkMode ? colors.surface : colors.surface,
      marginBottom: 10,
      position: 'relative',
    },
    actionIconProfile: {
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 2,
      backgroundColor: isDarkMode ? colors.surface : colors.surface,
      borderRadius: 20,
      padding: 4,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      marginBottom: 10,
      backgroundColor: isDarkMode ? colors.primary : '#90CAF9',
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 40,
      fontWeight: 'bold',
      color: colors.surface,
    },
    username: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 5,
      color: colors.text.primary,
    },
    levelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 5,
    },
    levelText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : '#333',
      marginRight: 10,
    },
    xpBar: {
      height: 10,
      backgroundColor: isDarkMode ? colors.background : '#f5f5f5',
      borderRadius: 5,
      flex: 1,
    },
    xpProgress: {
      height: '100%',
      backgroundColor: isDarkMode ? colors.primary : colors.primary,
      borderRadius: 5,
    },
    xpText: {
      fontSize: 14,
      color: isDarkMode ? colors.text.secondary : '#666',
    },
    points: {
      fontSize: 16,
      color: isDarkMode ? colors.text.secondary : '#666',
    },
    statsSection: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      padding: 20,
      backgroundColor: isDarkMode ? colors.surface : colors.surface,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : colors.primary,
    },
    statLabel: {
      fontSize: 14,
      color: isDarkMode ? colors.text.secondary : '#666',
      marginTop: 5,
    },
    section: {
      margin: 20,
      backgroundColor: isDarkMode ? colors.surface : colors.surface,
      borderRadius: 10,
      padding: 15,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 15,
      color: isDarkMode ? colors.accent : '#333',
    },
    journeyItem: {
      marginBottom: 20,
      backgroundColor: isDarkMode ? colors.surface : colors.surface,
      borderRadius: 10,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 3,
    },
    journeyImagesContainer: {
      height: 200,
      width: '100%',
    },
    journeyImage: {
      width: '100%',
      height: 200,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
    },
    noImageContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDarkMode ? colors.background : '#f5f5f5',
    },
    journeyContent: {
      padding: 15,
    },
    journalCard: {
      backgroundColor: isDarkMode ? colors.surface : colors.surface,
      borderRadius: 15,
      marginBottom: isDarkMode ? 24 : 16,
      overflow: 'hidden',
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.25 : 0.1,
      shadowRadius: isDarkMode ? 8 : 4,
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: isDarkMode ? colors.border : 'transparent',
    },
    journalCardImage: {
      width: '100%',
      height: 180,
    },
    journalCardNoImage: {
      width: '100%',
      height: 180,
      backgroundColor: isDarkMode ? colors.background : '#f5f5f5',
      justifyContent: 'center',
      alignItems: 'center',
    },
    journalCardContent: {
      padding: 16,
    },
    journalCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    journalCardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : '#333',
      flex: 1,
      marginRight: 8,
    },
    journalMissionBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? colors.accent + '22' : '#E8F5E9',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    journalMissionBadgeText: {
      fontSize: 12,
      color: isDarkMode ? colors.accent : '#4CAF50',
      marginLeft: 4,
      fontWeight: '600',
    },
    journalCardDate: {
      fontSize: 13,
      color: isDarkMode ? colors.text.secondary : '#666',
      marginBottom: 8,
    },
    journalCardDescription: {
      fontSize: 14,
      color: isDarkMode ? colors.text.secondary : '#666',
      lineHeight: 20,
      marginBottom: 12,
    },
    journalTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    journalTag: {
      fontSize: 12,
      color: isDarkMode ? colors.primary : colors.primary,
      backgroundColor: isDarkMode ? colors.primary + '22' : '#E3F2FD',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: 6,
      marginBottom: 4,
    },
    journalMoreTags: {
      fontSize: 12,
      color: isDarkMode ? colors.text.secondary : '#666',
      marginLeft: 4,
    },
    friendshipDate: {
      fontSize: 14,
      color: isDarkMode ? colors.text.secondary : '#888',
      marginTop: 4,
    },
    firstPlaceText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#FFD700',
    },
    secondPlaceText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#C0C0C0',
    },
    thirdPlaceText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#CD7F32',
    },
    titleText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : '#333',
    },
    privateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    privateTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : '#333',
      marginBottom: 10,
      textAlign: 'center',
    },
    privateText: {
      fontSize: 16,
      color: isDarkMode ? colors.text.secondary : '#666',
      textAlign: 'center',
    },
    customTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : '#7F5AF0',
      marginBottom: 2,
      textAlign: 'center',
    },
    mutualFriendItem: {
      marginRight: 10,
      alignItems: 'center',
    },
    mutualFriendAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginBottom: 5,
    },
    mutualFriendAvatarPlaceholder: {
      backgroundColor: isDarkMode ? colors.background : '#f5f5f5',
      justifyContent: 'center',
      alignItems: 'center',
    },
    mutualFriendAvatarText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDarkMode ? colors.text.secondary : '#666',
    },
    mutualFriendName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDarkMode ? colors.text.primary : '#333',
    },
    mutualFriendPoints: {
      fontSize: 14,
      color: isDarkMode ? colors.text.secondary : '#666',
    },
  });
}

// Estilos dinámicos para LeaderboardScreen
export function getLeaderboardScreenStyles(colors, isDarkMode, width) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? colors.background : colors.background,
      paddingHorizontal: width < 400 ? 6 : 16,
    },
    backButton: {
      borderRadius: 22,
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
      backgroundColor: isDarkMode ? colors.accent : colors.primary,
      shadowColor: 'transparent',
      elevation: 0,
    },
    backButtonText: {
      fontSize: 16,
      marginLeft: 8,
      color: isDarkMode ? colors.accent : colors.secondary,
      fontWeight: 'bold',
      letterSpacing: 1,
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      backgroundColor: isDarkMode ? colors.background : colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      minHeight: 56,
      marginBottom: 12,
    },
    headerTitleContainer: {
      flex: 1,
      alignItems: 'center',
      flexDirection: 'row',
    },
    title: {
      fontSize: width < 400 ? 22 : 28,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : '#fff',
      textAlign: 'center',
    },
    itemContainer: {
      backgroundColor: isDarkMode ? '#232B3A' : colors.surface,
      borderRadius: 20,
      padding: width < 400 ? 16 : 22,
      marginHorizontal: width < 400 ? 4 : 16,
      marginVertical: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.10 : 0.12,
      shadowRadius: isDarkMode ? 6 : 4,
      elevation: 2,
      borderWidth: 1.5,
      borderColor: isDarkMode ? colors.accent : (colors.border || 'transparent'),
    },
    rankContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    rankText: {
      fontSize: width < 400 ? 18 : 24,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : colors.primary,
      marginRight: 8,
    },
    usernameContainer: {
      flex: 1,
    },
    usernameText: {
      fontSize: width < 400 ? 16 : 20,
      fontWeight: 'bold',
      color: isDarkMode ? colors.text.primary : colors.text.primary,
    },
    pointsText: {
      fontSize: width < 400 ? 14 : 18,
      color: isDarkMode ? colors.text.secondary : colors.text.secondary,
      marginBottom: 4,
    },
    firstPlaceText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#FFD700',
      marginTop: 2,
    },
    secondPlaceText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#C0C0C0',
      marginTop: 2,
    },
    thirdPlaceText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#CD7F32',
      marginTop: 2,
    },
    titleText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDarkMode ? colors.text.primary : colors.text.primary,
      marginTop: 2,
    },
    errorText: {
      color: colors.error,
      textAlign: 'center',
      marginTop: 20,
    },
  });
}

export function getBadgesScreenStyles(colors, isDarkMode, width) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? colors.background : colors.background,
    },
    safeHeader: {
      backgroundColor: isDarkMode ? colors.background : colors.primary,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      marginTop: 10,
      backgroundColor: isDarkMode ? colors.background : colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    title: {
      fontSize: width < 400 ? 24 : 28,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : colors.surface,
      marginRight: 10,
    },
    cityTitle: {
      fontSize: width < 400 ? 24 : 28,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : colors.surface,
      marginRight: 10,
    },
    pointsCircle: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? colors.accent + '22' : '#E4EAFF',
      padding: 8,
      borderRadius: 20,
      minWidth: 60,
      justifyContent: 'center',
      gap: 4,
    },
    pointsCircleText: {
      fontSize: width < 400 ? 16 : 18,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : colors.primary,
    },
    backButton: {
      position: 'absolute',
      left: 16,
      top: '50%',
      transform: [{ translateY: -20 }],
      padding: 10,
      backgroundColor: isDarkMode ? colors.accent : colors.primary,
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rightPlaceholder: {
      width: 32,
    },
    content: {
      flex: 1,
      marginTop: 8,
    },
    summaryContainer: {
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'stretch',
      backgroundColor: isDarkMode ? colors.surface : '#fff',
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 20,
      marginHorizontal: 12,
      marginBottom: 16,
      marginTop: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
      borderWidth: 1,
      borderColor: isDarkMode ? colors.accent : colors.primary,
      gap: 0,
    },
    summaryItem: {
      width: '100%',
      alignItems: 'flex-start',
      paddingVertical: 10,
      paddingHorizontal: 2,
      marginBottom: 0,
    },
    summaryValue: {
      fontSize: width < 350 ? 20 : 24,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : colors.primary,
      marginBottom: 2,
    },
    summaryLabel: {
      fontSize: width < 350 ? 13 : 15,
      color: isDarkMode ? colors.text.secondary : '#1A202C',
      marginTop: 0,
      textAlign: 'left',
      width: '100%',
      fontWeight: '500',
    },
    divider: {
      width: '100%',
      height: 1,
      backgroundColor: '#E2E8F0',
      marginVertical: 2,
      borderRadius: 2,
      alignSelf: 'center',
      display: 'flex',
    },
    badgeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      padding: 16,
    },
    badgeItem: {
      backgroundColor: '#fff',
      borderRadius: 16,
      width: '96%',
      alignItems: 'center',
      marginVertical: 10,
      padding: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      alignSelf: 'center',
    },
    badgeIcon: {
      width: 60,
      height: 60,
      marginBottom: 8,
    },
    badgeName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : colors.primary,
      textAlign: 'center',
      marginBottom: 4,
    },
    badgeDescription: {
      fontSize: 14,
      color: isDarkMode ? colors.text.secondary : '#222',
      textAlign: 'center',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      color: isDarkMode ? colors.text.secondary : colors.text.secondary,
      marginTop: 10,
      fontSize: 16,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: isDarkMode ? colors.surface : colors.surface,
      borderRadius: 16,
      padding: 24,
      width: '90%',
      maxWidth: 400,
      alignItems: 'center',
      borderWidth: isDarkMode ? 1.5 : 1,
      borderColor: isDarkMode ? colors.accent : colors.primary,
      ...shadows.large,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 10,
      color: isDarkMode ? colors.accent : colors.text.primary,
    },
    closeButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      padding: 8,
      backgroundColor: isDarkMode ? colors.accent : colors.primary,
      borderRadius: 20,
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      marginTop: 8,
      textAlign: 'center',
    },
  });
}

export function getMissionsScreenStyles(colors, isDarkMode, width) {
  // Ajustes responsivos
  const isSmallScreen = width < 370;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? colors.background : colors.background,
      paddingHorizontal: width < 400 ? 6 : 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      marginTop: 10,
      backgroundColor: isDarkMode ? colors.background : colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    title: {
      fontSize: width < 400 ? 24 : 28,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : colors.surface,
      marginRight: 10,
    },
    cityTitle: {
      fontSize: width < 400 ? 24 : 28,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : colors.surface,
      marginRight: 10,
    },
    pointsCircle: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? colors.accent + '22' : '#E4EAFF',
      padding: 8,
      borderRadius: 20,
      minWidth: 60,
      justifyContent: 'center',
      gap: 4,
    },
    pointsCircleText: {
      fontSize: width < 400 ? 16 : 18,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : colors.primary,
    },
    backButton: {
      position: 'absolute',
      left: 16,
      top: '50%',
      transform: [{ translateY: -20 }],
      padding: 10,
      backgroundColor: isDarkMode ? colors.accent : colors.primary,
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backButtonText: {
      fontSize: 20,
      marginLeft: 5,
      color: isDarkMode ? '#181C22' : colors.surface,
      fontWeight: 'bold',
      letterSpacing: 1,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    refreshButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: isDarkMode ? colors.accent : '#E4EAFF',
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDarkMode ? colors.background : colors.background,
    },
    loadingText: {
      marginTop: 10,
      color: isDarkMode ? colors.text.primary : colors.text.primary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDarkMode ? colors.background : colors.background,
    },
    errorText: {
      color: colors.error,
      textAlign: 'center',
      padding: 20,
      fontWeight: 'bold',
    },
    pointsText: {
      fontSize: width < 400 ? 16 : 18,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : colors.surface,
    },
    citiesList: {
      flex: 1,
    },
    cityCard: {
      backgroundColor: isDarkMode ? colors.surface : colors.text.light,
      borderRadius: 15,
      padding: 15,
      marginBottom: 15,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.2 : 0.1,
      shadowRadius: isDarkMode ? 6 : 4,
      elevation: 3,
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: isDarkMode ? colors.accent : 'transparent',
    },
    cityCardContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    cityInfo: {
      flex: 1,
    },
    cityName: {
      fontSize: width < 400 ? 18 : 20,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : colors.primary,
      marginBottom: 5,
      letterSpacing: 1,
    },
    missionCount: {
      fontSize: width < 400 ? 12 : 14,
      color: isDarkMode ? colors.text.secondary : colors.primary,
    },
    progressBar: {
      height: 4,
      backgroundColor: isDarkMode ? colors.background : colors.background,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: isDarkMode ? colors.accent : colors.text.secondary,
    },
    missionsList: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: width < 400 ? 16 : 18,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : colors.text.light,
      marginBottom: 15,
      letterSpacing: 1,
    },
    completedDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 20,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: isDarkMode ? colors.accent : colors.text.light,
    },
    completedText: {
      color: isDarkMode ? colors.accent : colors.secondary,
      fontWeight: 'bold',
      marginHorizontal: 10,
      fontSize: 16,
      letterSpacing: 1,
    },
    card: {
      backgroundColor: isDarkMode ? colors.surface : colors.background,
      borderRadius: 10,
      padding: 15,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.2 : 0.1,
      shadowRadius: isDarkMode ? 6 : 4,
      elevation: 4,
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: isDarkMode ? colors.accent : 'transparent',
    },
    completedCard: {
      opacity: 0.8,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    cardTitle: {
      fontSize: width < 400 ? 16 : 18,
      fontWeight: 'bold',
      flex: 1,
      color: isDarkMode ? colors.accent : colors.text.primary,
      letterSpacing: 1,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 15,
      color: isDarkMode ? '#181C22' : colors.text.primary,
      fontSize: 12,
      fontWeight: 'bold',
      backgroundColor: isDarkMode ? colors.accent : colors.secondary,
      overflow: 'hidden',
    },
    badgeContainer: {
      flexDirection: 'column',
      alignItems: 'flex-end',
    },
    cardDescription: {
      color: isDarkMode ? colors.text.secondary : colors.text.primary,
      marginBottom: 10,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    difficulty: {
      color: isDarkMode ? colors.accent : colors.primary,
      fontSize: 12,
    },
    points: {
      color: isDarkMode ? colors.accent : colors.text.secondary,
      fontWeight: 'bold',
    },
    retryButton: {
      backgroundColor: isDarkMode ? colors.accent : colors.secondary,
      padding: 10,
      borderRadius: 5,
      marginTop: 10,
    },
    retryButtonText: {
      color: isDarkMode ? '#181C22' : colors.surface,
      textAlign: 'center',
      fontWeight: 'bold',
    },
    expiredCard: {
      borderColor: colors.error,
      borderWidth: 1,
    },
    timeRemaining: {
      fontSize: 12,
      color: isDarkMode ? colors.accent : colors.primary,
      marginTop: 4,
    },
    expiredTime: {
      color: colors.error,
    },
    generatingLoaderOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    generatingLoaderContainer: {
      backgroundColor: isDarkMode ? colors.accent : colors.secondary,
      padding: 20,
      borderRadius: 10,
      width: '80%',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    generatingText: {
      color: isDarkMode ? '#181C22' : colors.surface,
      marginTop: 10,
      fontSize: 16,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    generatingSubtext: {
      color: isDarkMode ? '#181C22' : colors.surface,
      marginTop: 5,
      fontSize: 14,
      textAlign: 'center',
    },
    shareIcon: {
      padding: 5,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: '80%',
      backgroundColor: isDarkMode ? colors.surface : colors.secondary,
      borderRadius: 10,
      padding: 20,
      maxHeight: '80%',
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: isDarkMode ? colors.accent : 'transparent',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 10,
      color: isDarkMode ? colors.accent : colors.text.primary,
    },
    friendItem: {
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? colors.accent : colors.border,
    },
    friendName: {
      fontSize: 16,
      color: isDarkMode ? colors.accent : colors.text.primary,
    },
    friendPoints: {
      fontSize: 14,
      color: isDarkMode ? colors.text.secondary : colors.primary,
    },
    cancelButton: {
      marginTop: 10,
      backgroundColor: colors.error,
      padding: 10,
      borderRadius: 5,
      alignItems: 'center',
    },
    cancelButtonText: {
      color: colors.surface,
      fontWeight: 'bold',
    },
    levelUpContainer: {
      marginTop: 15,
      backgroundColor: isDarkMode ? colors.accent : colors.secondary,
      padding: 10,
      borderRadius: 8,
      width: '100%',
      alignItems: 'center',
    },
    levelUpText: {
      color: isDarkMode ? '#181C22' : colors.surface,
      fontWeight: 'bold',
      fontSize: 16,
    },
    actionsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    hintIcon: {
      padding: 5,
      backgroundColor: isDarkMode ? colors.accent + '22' : 'rgba(255, 185, 0, 0.15)',
      borderRadius: 20,
      width: 30,
      height: 30,
      justifyContent: 'center',
      alignItems: 'center',
    },
    routeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? colors.accent + '22' : '#E4EAFF',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 10,
    },
    routeButtonText: {
      color: isDarkMode ? colors.accent : '#005F9E',
      marginLeft: 5,
      fontWeight: '500',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    routeList: {
      maxHeight: '80%',
    },
    routeItem: {
      flexDirection: 'row',
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? colors.accent : colors.border,
    },
    routeNumber: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: isDarkMode ? colors.accent : colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
    },
    routeNumberText: {
      color: isDarkMode ? '#181C22' : colors.surface,
      fontWeight: 'bold',
    },
    routeMissionInfo: {
      flex: 1,
    },
    routeMissionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDarkMode ? colors.accent : colors.primary,
      marginBottom: 5,
    },
    routeMissionDescription: {
      fontSize: 14,
      color: isDarkMode ? colors.text.secondary : colors.text.primary,
      marginBottom: 8,
    },
    routeMissionMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    routeMissionDifficulty: {
      fontSize: 12,
      color: isDarkMode ? colors.text.secondary : colors.text.secondary,
    },
    routeMissionPoints: {
      fontSize: 12,
      color: isDarkMode ? colors.text.secondary : colors.text.secondary,
      fontWeight: 'bold',
    },
    createFormContainer: {
      padding: 16,
    },
    completeButton: {
      backgroundColor: isDarkMode ? colors.accent : colors.primary,
      borderRadius: borderRadius.xl,
      paddingVertical: isSmallScreen ? 12 : 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
      marginBottom: 0,
      width: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
      minWidth: 120,
      maxWidth: 300,
      alignSelf: 'center',
    },
    completeButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: isSmallScreen ? 16 : 18,
      textAlign: 'center',
    },
  });
}

// Estilos dinámicos para los modales de misiones (completar, pista, subir foto, completando)
export function getMissionModalsStyles(colors, isDarkMode, width) {
  // Ajustes responsivos
  const isSmallScreen = width < 370;
  return StyleSheet.create({
    // Overlay general para modales
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    // Contenido principal del modal
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: isSmallScreen ? 14 : 24,
      width: '96%',
      maxWidth: 420,
      maxHeight: '90%',
      alignItems: 'center',
      borderWidth: isDarkMode ? 1.5 : 1,
      borderColor: isDarkMode ? colors.accent : colors.primary,
      ...shadows.large,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginBottom: 12,
    },
    modalTitle: {
      ...typography.h2,
      color: colors.text.primary,
      flex: 1,
      textAlign: 'left',
    },
    closeButton: {
      padding: 6,
      borderRadius: 20,
      backgroundColor: isDarkMode ? colors.accent : colors.primary,
      marginLeft: 8,
    },
    // Contenedor de botones principales (Tomar foto / Galería)
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'stretch',
      width: '100%',
      gap: 8,
      marginBottom: isSmallScreen ? 10 : 18,
    },
    mainButton: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.xl,
      paddingVertical: isSmallScreen ? 10 : spacing.md,
      paddingHorizontal: isSmallScreen ? 6 : spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      minWidth: 0,
      marginHorizontal: 0,
      borderWidth: 2,
      borderColor: isDarkMode ? colors.accent : 'transparent',
    },
    mainButtonText: {
      color: colors.surface,
      fontWeight: 'bold',
      textAlign: 'center',
      fontSize: isSmallScreen ? 15 : 18,
      flexWrap: 'wrap',
      includeFontPadding: false,
    },
    cancelButton: {
      backgroundColor: isDarkMode ? colors.background : colors.divider,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.sm,
      width: '100%',
    },
    cancelButtonText: {
      color: colors.text.secondary,
      ...typography.body,
      textAlign: 'center',
    },
    // Para tarjetas de imagen
    imageCardContainer: {
      width: '100%',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 20,
      backgroundColor: colors.surface,
    },
    imageCardHeader: {
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      backgroundColor: isDarkMode ? colors.background : '#f9f9f9',
    },
    imageCardHeaderText: {
      fontSize: 16,
      color: colors.primary,
      marginLeft: 8,
      fontWeight: '500',
    },
    imagePreviewContainer: {
      width: '100%',
      height: 220,
      backgroundColor: isDarkMode ? colors.background : '#f5f5f5',
    },
    previewImage: {
      width: '100%',
      height: '100%',
    },
    loadingText: {
      marginTop: 10,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    // Barra de progreso
    progressBarContainer: {
      height: 10,
      backgroundColor: isDarkMode ? colors.divider : '#f0f0f0',
      borderRadius: 10,
      overflow: 'hidden',
      width: '100%',
      marginVertical: 5,
    },
    progressBar: {
      height: '100%',
      backgroundColor: colors.primary,
    },
    // Botón de pista
    hintButton: {
      backgroundColor: colors.warningCard,
      padding: 12,
      borderRadius: 10,
      marginVertical: 15,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    },
    hintButtonText: {
      color: colors.surface,
      fontWeight: 'bold',
      marginLeft: 10,
      fontSize: 16,
    },
    // Contenedor de pista
    hintContainer: {
      backgroundColor: isDarkMode ? colors.background : colors.eventBackground,
      padding: 15,
      borderRadius: 10,
      marginVertical: 15,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      width: '100%',
    },
    hintTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 5,
    },
    hintText: {
      fontSize: 14,
      color: colors.text.primary,
      lineHeight: 20,
    },
    // Errores
    errorContainer: {
      width: '100%',
      marginBottom: 15,
      alignItems: 'center',
    },
    errorText: {
      color: colors.error,
      textAlign: 'center',
    },
    // Loader de completando misión
    loadingCard: {
      backgroundColor: colors.surface,
      padding: 24,
      borderRadius: 16,
      alignItems: 'center',
      width: '90%',
      maxWidth: 320,
      ...shadows.medium,
    },
    loadingTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.primary,
      marginTop: 15,
      marginBottom: 10,
      textAlign: 'center',
    },
    loadingDescription: {
      color: colors.text.secondary,
      textAlign: 'center',
      marginBottom: 15,
    },
    // Otros estilos reutilizables
    sectionTitle: {
      ...typography.h3,
      color: colors.primary,
      marginBottom: 10,
      textAlign: 'center',
    },
    infoIcon: {
      marginBottom: 10,
    },
    warningIcon: {
      marginBottom: 10,
    },
    // Para imágenes en modales
    imageContainer: {
      marginVertical: 15,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: colors.surface,
    },
    missionImage: {
      width: '100%',
      height: 200,
    },
    // Para XP y recompensas
    rewardsContainer: {
      marginTop: 18,
      marginBottom: 10,
      alignItems: 'center',
      width: '100%',
    },
    rewardsTitle: {
      ...typography.h3,
      color: colors.accent,
      marginBottom: 8,
      textAlign: 'center',
    },
    rewardItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    rewardText: {
      fontSize: 16,
      color: colors.text.primary,
      marginLeft: 8,
    },
    levelContainer: {
      marginTop: 10,
      alignItems: 'center',
      width: '100%',
    },
    levelUpText: {
      color: colors.success,
      fontWeight: 'bold',
      fontSize: 16,
      marginBottom: 6,
      textAlign: 'center',
    },
    levelText: {
      color: colors.text.secondary,
      fontSize: 15,
      marginBottom: 6,
      textAlign: 'center',
    },
    xpProgressBackground: {
      height: 10,
      backgroundColor: colors.divider,
      borderRadius: 5,
      width: '100%',
      marginVertical: 6,
    },
    xpProgressFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 5,
    },
    xpText: {
      fontSize: 13,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    continueButton: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.lg,
      width: '100%',
    },
    continueButtonText: {
      color: colors.surface,
      ...typography.h3,
      fontWeight: 'bold',
      textAlign: 'center',
    },
  });
} 