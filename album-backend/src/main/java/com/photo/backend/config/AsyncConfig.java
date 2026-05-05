package com.photo.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * 配置 @Async 线程池，强制串行执行向量索引任务。
 * phal_ts 加载 CLIP/EasyOCR/Qdrant 均为 CPU 密集型操作，并发会导致所有请求互相拖慢甚至失败。
 * 因此将 corePoolSize 与 maxPoolSize 都设为 1，确保后端的分析请求逐个发送给 phal_ts，
 * 前一次分析完成后才发送下一次。
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        // 单线程串行执行：确保 phal_ts 每次只处理一个请求
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(1);
        // 队列容量足够大，避免上传高峰时任务被拒绝
        executor.setQueueCapacity(1000);
        executor.setThreadNamePrefix("async-vector-");
        // 当队列满时，由调用者线程自己执行（兜底保护）
        executor.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());
        // 优雅关闭：等待所有排队任务完成
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(120);
        executor.initialize();
        return executor;
    }
}
