// Layjou Bubble — configuration.
// The ad unit IDs below are Google's official TEST IDs. Before publishing:
//   1. replace them with your own rewarded ad unit IDs from https://apps.admob.com
//   2. set `testing` to false
//   3. replace the AdMob *App* IDs in android/app/src/main/res/values/strings.xml (admob_app_id)
//      and ios/App/App/Info.plist (GADApplicationIdentifier)
window.LAYJOU_CONFIG = {
  admob: {
    testing: true,
    rewarded: {
      android: 'ca-app-pub-3940256099942544/5224354917',
      ios: 'ca-app-pub-3940256099942544/1712485313',
    },
  },
  // Extra moves granted when the player watches a rewarded ad after running out of moves.
  continueMoves: 5,
};
