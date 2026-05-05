package com.photo.backend.user.controller;

import com.photo.backend.common.dto.ApiResponse;
import com.photo.backend.common.entity.PaymentOrder;
import com.photo.backend.asset.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// [新增] 支付接口控制器
@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    // [新增] 创建支付订单
    @PostMapping("/create")
    public ResponseEntity<ApiResponse<PaymentOrder>> createOrder(@RequestBody Map<String, Object> request) {
        try {
            Integer userId = (Integer) request.get("userId");
            Integer amount = (Integer) request.get("amount");
            Integer months = (Integer) request.get("months");

            if (userId == null) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("用户ID不能为空", "USER_ID_REQUIRED"));
            }
            if (months == null) months = 1;
            if (amount == null) amount = 2000; // 默认 20 元 = 2000 分

            PaymentOrder order = paymentService.createOrder(userId, amount, months);
            return ResponseEntity.ok(ApiResponse.success(order, "订单创建成功"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("创建订单失败: " + e.getMessage(), "CREATE_ORDER_FAILED"));
        }
    }

    // [新增] 模拟支付确认
    @PostMapping("/confirm")
    public ResponseEntity<ApiResponse<PaymentOrder>> confirmPayment(@RequestBody Map<String, String> request) {
        try {
            String orderId = request.get("orderId");
            if (orderId == null || orderId.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("订单ID不能为空", "ORDER_ID_REQUIRED"));
            }

            PaymentOrder order = paymentService.confirmPayment(orderId);
            return ResponseEntity.ok(ApiResponse.success(order, "支付成功，会员已开通"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("支付确认失败: " + e.getMessage(), "CONFIRM_PAYMENT_FAILED"));
        }
    }

    // [新增] 查询用户最近一笔已支付订单（用于前端判断当前套餐类型）
    @GetMapping("/latest")
    public ResponseEntity<ApiResponse<PaymentOrder>> getLatestPaidOrder(@RequestParam Integer userId) {
        try {
            PaymentOrder order = paymentService.getLatestPaidOrder(userId);
            if (order == null) {
                return ResponseEntity.ok(ApiResponse.success(null, "暂无支付记录"));
            }
            return ResponseEntity.ok(ApiResponse.success(order));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("查询订单失败: " + e.getMessage(), "GET_ORDER_FAILED"));
        }
    }
}
