package com.photo.backend.util;

import org.springframework.web.multipart.MultipartFile;

import java.io.*;

/**
 * 将本地文件系统上的文件包装为 Spring MultipartFile，
 * 方便在业务代码中直接调用 Service 的上传接口。
 */
public class FileMultipartFile implements MultipartFile {
    private final File file;
    private final String name;
    private final String originalFilename;
    private final String contentType;

    public FileMultipartFile(File file, String name, String originalFilename, String contentType) {
        this.file = file;
        this.name = name;
        this.originalFilename = originalFilename;
        this.contentType = contentType;
    }

    @Override
    public String getName() {
        return name;
    }

    @Override
    public String getOriginalFilename() {
        return originalFilename;
    }

    @Override
    public String getContentType() {
        return contentType;
    }

    @Override
    public boolean isEmpty() {
        return file.length() == 0;
    }

    @Override
    public long getSize() {
        return file.length();
    }

    @Override
    public byte[] getBytes() throws IOException {
        try (FileInputStream fis = new FileInputStream(file)) {
            return fis.readAllBytes();
        }
    }

    @Override
    public InputStream getInputStream() throws IOException {
        return new FileInputStream(file);
    }

    @Override
    public void transferTo(File dest) throws IOException {
        try (InputStream in = new FileInputStream(file);
             OutputStream out = new FileOutputStream(dest)) {
            in.transferTo(out);
        }
    }
}
