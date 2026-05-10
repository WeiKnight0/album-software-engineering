import React, { useEffect, useState } from 'react';
import { authResourceUrl } from '../services/api';

type AuthImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
};

const AuthImage: React.FC<AuthImageProps> = ({ src, ...props }) => {
  const [blobUrl, setBlobUrl] = useState('');

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    authResourceUrl(src)
      .then(url => {
        objectUrl = url;
        if (active) setBlobUrl(url);
        else URL.revokeObjectURL(url);
      })
      .catch(() => {
        if (active) setBlobUrl('');
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return <img {...props} src={blobUrl} />;
};

export default AuthImage;
