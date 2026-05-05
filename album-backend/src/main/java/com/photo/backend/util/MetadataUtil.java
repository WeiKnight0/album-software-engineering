package com.photo.backend.util;

import com.drew.imaging.ImageMetadataReader;
import com.drew.imaging.ImageProcessingException;
import com.drew.metadata.Metadata;
import com.drew.metadata.MetadataException;
import com.drew.metadata.exif.ExifSubIFDDirectory;
import com.drew.metadata.exif.GpsDirectory;
import com.drew.metadata.exif.GpsDescriptor;
import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class MetadataUtil {

    public static LocalDateTime extractCaptureTime(File imageFile) {
        try {
            Metadata metadata = ImageMetadataReader.readMetadata(imageFile);
            ExifSubIFDDirectory directory = metadata.getFirstDirectoryOfType(ExifSubIFDDirectory.class);
            if (directory != null && directory.containsTag(ExifSubIFDDirectory.TAG_DATETIME_ORIGINAL)) {
                String dateTimeStr = directory.getString(ExifSubIFDDirectory.TAG_DATETIME_ORIGINAL);
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy:MM:dd HH:mm:ss");
                return LocalDateTime.parse(dateTimeStr, formatter);
            }
        } catch (ImageProcessingException | IOException e) {
            e.printStackTrace();
        }
        return null;
    }

    public static Double[] extractGpsCoordinates(File imageFile) {
        try {
            Metadata metadata = ImageMetadataReader.readMetadata(imageFile);
            GpsDirectory gpsDirectory = metadata.getFirstDirectoryOfType(GpsDirectory.class);
            if (gpsDirectory != null) {
                GpsDescriptor descriptor = new GpsDescriptor(gpsDirectory);
                Double latitude = null;
                Double longitude = null;
                try {
                    latitude = gpsDirectory.getDouble(GpsDirectory.TAG_LATITUDE);
                    longitude = gpsDirectory.getDouble(GpsDirectory.TAG_LONGITUDE);
                } catch (MetadataException e) {
                    e.printStackTrace();
                }
                if (latitude != null && longitude != null) {
                    // Convert to decimal degrees
                    String latitudeRef = gpsDirectory.getString(GpsDirectory.TAG_LATITUDE_REF);
                    String longitudeRef = gpsDirectory.getString(GpsDirectory.TAG_LONGITUDE_REF);
                    if (latitudeRef != null && latitudeRef.equals("S")) {
                        latitude = -latitude;
                    }
                    if (longitudeRef != null && longitudeRef.equals("W")) {
                        longitude = -longitude;
                    }
                    return new Double[]{latitude, longitude};
                }
            }
        } catch (ImageProcessingException | IOException e) {
            e.printStackTrace();
        }
        return null;
    }
}