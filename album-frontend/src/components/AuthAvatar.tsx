import React, { useEffect, useState } from 'react';
import { Avatar } from 'antd';
import type { AvatarProps } from 'antd';
import { userAPI } from '../services/api';

type AuthAvatarProps = AvatarProps & {
  hasCustomAvatar?: boolean;
};

const AuthAvatar: React.FC<AuthAvatarProps> = ({ hasCustomAvatar, src, ...props }) => {
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!hasCustomAvatar) {
      setAvatarUrl(typeof src === 'string' ? src : userAPI.getDefaultAvatarUrl());
      return;
    }

    let active = true;
    let objectUrl = '';
    userAPI.getAvatarBlobUrl()
      .then(url => {
        objectUrl = url;
        if (active) setAvatarUrl(url);
        else URL.revokeObjectURL(url);
      })
      .catch(() => {
        if (active) setAvatarUrl(userAPI.getDefaultAvatarUrl());
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [hasCustomAvatar, src]);

  return <Avatar {...props} src={avatarUrl} />;
};

export default AuthAvatar;
