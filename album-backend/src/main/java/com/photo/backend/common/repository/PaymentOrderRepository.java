package com.photo.backend.common.repository;

import com.photo.backend.common.entity.PaymentOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

// [新增] 支付订单数据访问层
public interface PaymentOrderRepository extends JpaRepository<PaymentOrder, String> {
    List<PaymentOrder> findByUserIdOrderByCreatedAtDesc(Integer userId);
}
