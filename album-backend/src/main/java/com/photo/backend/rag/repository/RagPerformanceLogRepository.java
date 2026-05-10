package com.photo.backend.rag.repository;

import com.photo.backend.rag.entity.RagPerformanceLog;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RagPerformanceLogRepository extends JpaRepository<RagPerformanceLog, Long>, JpaSpecificationExecutor<RagPerformanceLog> {
}
