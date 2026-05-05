package com.photo.backend.util;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.util.Iterator;

public class ThumbnailUtil {

    private static final int THUMBNAIL_MAX_WIDTH = 800;
    private static final int THUMBNAIL_MAX_HEIGHT = 800;

    public static String generateThumbnail(File originalFile, String outputDir, String uuid) throws IOException {
        File thumbDir = new File(outputDir);
        if (!thumbDir.exists()) {
            thumbDir.mkdirs();
        }

        String extension = getExtension(originalFile.getName());
        String thumbnailFilename = uuid + "_thumb." + extension;
        File thumbnailFile = new File(outputDir, thumbnailFilename);

        try (ImageInputStream iis = ImageIO.createImageInputStream(originalFile)) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(iis);
            if (!readers.hasNext()) {
                throw new IOException("No suitable image reader found for: " + originalFile.getName());
            }

            ImageReader reader = readers.next();
            try {
                reader.setInput(iis);

                int originalWidth = reader.getWidth(0);
                int originalHeight = reader.getHeight(0);

                int[] newDimensions = calculateDimensions(originalWidth, originalHeight, THUMBNAIL_MAX_WIDTH, THUMBNAIL_MAX_HEIGHT);
                int newWidth = newDimensions[0];
                int newHeight = newDimensions[1];

                BufferedImage originalImage = reader.read(0);
                BufferedImage thumbnailImage = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB);

                Graphics2D g2d = thumbnailImage.createGraphics();
                g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
                g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
                g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

                g2d.drawImage(originalImage, 0, 0, newWidth, newHeight, null);
                g2d.dispose();

                String formatName = getFormatName(extension);
                ImageIO.write(thumbnailImage, formatName, thumbnailFile);

                return thumbnailFilename;
            } finally {
                reader.dispose();
            }
        }
    }

    private static int[] calculateDimensions(int originalWidth, int originalHeight, int maxWidth, int maxHeight) {
        if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
            return new int[]{originalWidth, originalHeight};
        }

        int newWidth, newHeight;
        double widthRatio = (double) maxWidth / originalWidth;
        double heightRatio = (double) maxHeight / originalHeight;
        double ratio = Math.min(widthRatio, heightRatio);

        newWidth = (int) (originalWidth * ratio);
        newHeight = (int) (originalHeight * ratio);

        return new int[]{newWidth, newHeight};
    }

    private static String getExtension(String filename) {
        int lastDot = filename.lastIndexOf('.');
        if (lastDot > 0) {
            return filename.substring(lastDot + 1).toLowerCase();
        }
        return "jpg";
    }

    private static String getFormatName(String extension) {
        switch (extension.toLowerCase()) {
            case "png":
                return "png";
            case "gif":
                return "gif";
            case "bmp":
                return "bmp";
            case "wbmp":
                return "wbmp";
            case "jpg":
            case "jpeg":
            default:
                return "jpg";
        }
    }
}
