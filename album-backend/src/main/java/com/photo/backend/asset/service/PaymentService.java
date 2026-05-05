package com.photo.backend.asset.service;

import com.photo.backend.common.entity.PaymentOrder;
import com.photo.backend.common.entity.User;
import com.photo.backend.common.repository.PaymentOrderRepository;
import com.photo.backend.common.repository.UserRepository;
import com.photo.backend.user.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

// [新增] 支付服务层：处理订单创建与支付确认
@Service
public class PaymentService {

    @Autowired
    private PaymentOrderRepository paymentOrderRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    // [新增] 创建支付订单
    @Transactional
    public PaymentOrder createOrder(Integer userId, Integer amount, Integer months) {
        PaymentOrder order = new PaymentOrder();
        order.setOrderId(UUID.randomUUID().toString());
        order.setUserId(userId);
        order.setAmount(amount);
        order.setStatus("PENDING");
        order.setPaymentMethod("MOCK");
        order.setCreatedAt(LocalDateTime.now());
        order.setExpireAt(LocalDateTime.now().plusMonths(months));
        return paymentOrderRepository.save(order);
    }

    // [新增] 模拟支付确认：更新订单状态并开通会员
    @Transactional
    public PaymentOrder confirmPayment(String orderId) {
        PaymentOrder order = paymentOrderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("订单不存在"));

        if (!"PENDING".equals(order.getStatus())) {
            throw new RuntimeException("订单状态错误，无法重复支付");
        }

        // 更新订单为已支付
        order.setStatus("PAID");
        order.setPaidAt(LocalDateTime.now());
        paymentOrderRepository.save(order);

        // 开通会员权益
        userService.activateMembership(order.getUserId(), order.getExpireAt());

        return order;
    }

    // [新增] 查询用户最近一笔已支付的订单，用于判断当前套餐类型
    public PaymentOrder getLatestPaidOrder(Integer userId) {
        java.util.List<PaymentOrder> orders = paymentOrderRepository.findByUserIdOrderByCreatedAtDesc(userId);
        for (PaymentOrder order : orders) {
            if ("PAID".equals(order.getStatus())) {
                return order;
            }
        }
        return null;
    }
}
