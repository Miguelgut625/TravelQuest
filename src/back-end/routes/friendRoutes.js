// friendRoutes.js
const { Router } = require('express');
const {
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  deleteFriendship,
  cancelFriendRequest,
  getMutualFriends,
  checkFriendshipStatus,
  getUserRank,
  getSentPendingRequests,
  checkPendingRequests,
  getUserProfileData,
  getUserVisitedCities
} = require('../controllers/friendController');

const router = Router();

// Rutas para amigos
router.get('/:userId', getFriends);
router.get('/requests/:userId', getFriendRequests);
router.post('/send-request', sendFriendRequest);
router.put('/accept-request/:requestId', acceptFriendRequest);
router.put('/reject-request/:requestId', rejectFriendRequest);
router.delete('/:userId1/:userId2', deleteFriendship);
router.delete('/cancel-request/:senderId/:receiverId', cancelFriendRequest);
router.get('/mutual/:userId1/:userId2', getMutualFriends);
router.get('/check-status/:userId1/:userId2', checkFriendshipStatus);
router.get('/rank/:userId', getUserRank);
router.get('/sent-requests/:userId', getSentPendingRequests);
router.get('/check-pending/:userId1/:userId2', checkPendingRequests);
router.get('/profile/:userId', getUserProfileData);
router.get('/visited-cities/:userId', getUserVisitedCities);

module.exports = router;
