import { Platform, StyleSheet } from 'react-native';

const colors = {
  primary: '#005F9E',
  success: '#2E7D32',
  danger: '#D32F2F',
  warning: '#FFA000',
  background: '#FAFAFA',
  text: '#212121',
  white: '#FFFFFF',
  lightGray: '#E0E0E0',
  darkGray: '#757575',
};

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  searchContainer: {
    backgroundColor: colors.white,
    padding: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 9999,
    position: 'relative',
  },
  mapContainer: {
    flex: 1,
    marginTop: 10,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  input: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    paddingHorizontal: 10,
    backgroundColor: colors.white,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingCard: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  loadingStep: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.darkGray,
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    fontSize: 16,
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.primary,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    marginLeft: 6,
    color: colors.text,
  },
  citiesList: {
    flex: 1,
  },
  cityCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cityCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  cityTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  missionCount: {
    fontSize: 14,
    color: colors.darkGray,
  },
  expiredCount: {
    fontSize: 14,
    color: colors.danger,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.lightGray,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
  },
  missionsList: {
    flex: 1,
  },
  section: {
    margin: 20,
  },  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginVertical: 16,
  },
  completedDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.lightGray,
  },
  completedText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 10,
    color: colors.success,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  completedCard: {
    opacity: 0.7,
  },
  expiredCard: {
    borderWidth: 1,
    borderColor: colors.danger,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  badgeContainer: {
    alignItems: 'flex-end',
  },
  badge: {
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
  },
  badgePending: {
    backgroundColor: colors.warning,
  },
  badgeCompleted: {
    backgroundColor: colors.success,
  },
  badgeExpired: {
    backgroundColor: colors.danger,
  },
  timeRemaining: {
    fontSize: 12,
    color: colors.darkGray,
    marginTop: 4,
  },
  expiredTime: {
    color: colors.danger,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.darkGray,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  difficulty: {
    fontSize: 12,
    color: colors.darkGray,
  },
  points: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.success,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  datePickersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
  },
  datePickerContainer: {
    position: 'relative',
    zIndex: 9999,
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    overflow: 'visible',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
      }
    })
  },
  datePickerButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
  },
  datePickerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerText: {
    color: colors.white,
    fontSize: 16,
  },
  calendarDropdown: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 15,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  durationText: {
    textAlign: 'center',
    marginBottom: 10,
    color: '#666',
  },
  dateRangeContainer: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
  },
  suggestionsList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: 5,
    maxHeight: 200,
    zIndex: 2,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  suggestionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
  },
  errorOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    padding: 10,
    borderRadius: 5,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: colors.white,
    marginTop: -20,
    marginHorizontal: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statCard: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.success,
  },
  statLabel: {
    fontSize: 14,
    color: colors.darkGray,
  },
  logoutButton: {
    margin: 20,
    backgroundColor: colors.danger,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContent: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: colors.danger,
  },
  saveButton: {
    backgroundColor: colors.success,
  },
  modalButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageText: {
    textAlign: 'center',
    marginBottom: 15,
    padding: 10,
    borderRadius: 5,
  },
  errorMessage: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  successMessage: {
    backgroundColor: '#e8f5e9',
    color: colors.success,
  },
  disabledButton: {
    opacity: 0.7,
  },
  privacyContainer: {
    backgroundColor: colors.white,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    padding: 15,
  },
  privacyButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  privacyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  privacyDescription: {
    fontSize: 14,
    color: colors.darkGray,
    textAlign: 'center',
  },
  cityTabs: {
    marginBottom: 20,
  },
  cityTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  selectedCityTab: {
    backgroundColor: '#4CAF50',
  },
  cityTabText: {
    color: '#666',
    fontWeight: 'bold',
  },
  selectedCityTabText: {
    color: 'white',
  },
  entriesList: {
    flex: 1,
  },
  cardContent: {
    color: '#333',
    marginBottom: 10,
  },
  photoGrid: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 5,
    marginRight: 5,
  },
  morePhotos: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePhotosText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    color: '#4CAF50',
    marginRight: 10,
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
    fontSize: 16,
  },
  cardText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },  
  // Journal Screen Styles
  journalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  journalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  journalCityTabs: {
    marginBottom: 20,
  },
  journalCityTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  journalSelectedCityTab: {
    backgroundColor: '#4CAF50',
  },
  journalCityTabText: {
    color: '#666',
    fontWeight: 'bold',
  },
  journalSelectedCityTabText: {
    color: 'white',
  },
  journalEntriesList: {
    flex: 1,
  },
  journalCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  journalCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  journalCardDate: {
    color: '#666',
    fontSize: 12,
    marginBottom: 10,
  },
  journalCardContent: {
    color: '#333',
    marginBottom: 10,
  },
  journalPhotoGrid: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  journalThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 5,
    marginRight: 5,
  },
  journalMorePhotos: {
    width: 80,
    height: 80,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  journalMorePhotosText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  journalTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  journalTag: {
    color: '#4CAF50',
    marginRight: 10,
    fontSize: 12,
  },
  journalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  journalLoadingText: {
    marginTop: 10,
    color: '#666',
  },
  journalErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  journalErrorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
  },
  journalRetryButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
  },
  journalRetryButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  journalEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  journalEmptyText: {
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
    fontSize: 16,
  },
  journalCityCard: {
    width: Platform.OS === 'web' ? '20%' : '95%',
    aspectRatio: 1,
    backgroundColor: '#333',
    borderRadius: 15,
    margin: '2.5%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  journalCarouselContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  journalImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  journalCityCardBackground: {
    width: '100%',
    height: '100%',
  },
  journalCityCardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  journalCityCardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: '5%',
  },
  journalTextContainer: {
    backgroundColor: '#000000',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    width: '90%',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  journalCityName: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
    textAlign: 'center',
    color: '#ffffff',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  journalViewMissionsText: {
    color: '#ffffff',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  journalCityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: Platform.OS === 'web' ? 'flex-start' : 'center',
    alignItems: 'flex-start',
    paddingHorizontal: '1%',
  },
  journalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  journalBackButton: {
    padding: 10,
    marginRight: 10,
  },
  journalCarouselDots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  journalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 2,
  },
  journalActiveDot: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  journalNoImageBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  journalMissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  journalMissionBadgeText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});
