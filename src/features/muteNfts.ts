import {buildURLWithSearchParams} from '../helpers/networkHelpers';
import {makeBTDModule} from '../types/btdCommonTypes';

export const muteNftAvatars = makeBTDModule(({TD, jq}) => {
  jq.ajaxPrefilter((ajaxOptions) => {
    try {
      const url = new URL(ajaxOptions.url || '');

      if (!url.searchParams.has('include_ext_alt_text')) {
        return;
      }

      ajaxOptions.url = buildURLWithSearchParams(ajaxOptions.url || '', {
        include_ext_has_nft_avatar: true,
      });
    } catch (e) {
      //
    }
  });

  TD.services.TwitterUser.prototype.OGFromJSON = TD.services.TwitterUser.prototype.fromJSONObject;

  TD.services.TwitterUser.prototype.fromJSONObject = function fromJSONObject(blob: any) {
    var baseTweet = this.OGFromJSON(blob);

    baseTweet.hasNftAvatar = Boolean(blob.ext_has_nft_avatar);

    return baseTweet;
  };

  const nftFilters = TD.controller.filterManager
    .getAll()
    .filter((f) => f.type === 'BTD_nft_avatar');

  if (nftFilters.length < 1) {
    TD.controller.filterManager.addFilter('BTD_nft_avatar', '');
  }
});