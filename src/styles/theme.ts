import { StyleSheet, Dimensions } from 'react-native';

// Paleta de colores profesional para una app de viajes
export const lightColors = {
  primary: '#2B6CB0',      // Azul profundo y confiable
  secondary: '#38A169',    // Verde naturaleza
  accent: '#D69E2E',       // Dorado cálido
  background: '#F7FAFC',   // Fondo claro suave
  surface: '#FFFFFF',      // Superficie blanca
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
    backgroundColor: colors.primary,
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