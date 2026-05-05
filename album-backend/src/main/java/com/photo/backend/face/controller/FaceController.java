package com.photo.backend.face.controller;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.photo.backend.common.dto.ApiResponse;
import com.photo.backend.common.entity.Face;
import com.photo.backend.common.entity.FaceAppearance;
import com.photo.backend.common.entity.Image;
import com.photo.backend.common.repository.FaceAppearanceRepository;
import com.photo.backend.common.repository.FaceRepository;
import com.photo.backend.asset.service.ImageService;
import com.photo.backend.face.service.FaceDeleteService;
import com.photo.backend.face.service.FaceRecognitionPersistenceService;
import com.photo.backend.face.service.FaceService;
import com.photo.backend.face.service.FaceMergeService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

/**
 * 人脸相关接口入口。
 * 目前主要提供“人物信息备注”接口，用于给已经识别出来的人脸绑定姓名。
 */
@RestController
@RequestMapping("/api/face")
public class FaceController {
	private final FaceService faceService;
	private final ImageService imageService;
	private final FaceRepository faceRepository;
	private final FaceAppearanceRepository faceAppearanceRepository;
	private final FaceRecognitionPersistenceService faceRecognitionPersistenceService;

	public FaceController(
		FaceService faceService,
		ImageService imageService,
		FaceRepository faceRepository,
		FaceAppearanceRepository faceAppearanceRepository,
		FaceRecognitionPersistenceService faceRecognitionPersistenceService
	) {
		this.faceService = faceService;
		this.imageService = imageService;
		this.faceRepository = faceRepository;
		this.faceAppearanceRepository = faceAppearanceRepository;
		this.faceRecognitionPersistenceService = faceRecognitionPersistenceService;
	}

	/**
	 * 修改指定人脸的备注信息。
	 *
	 * <p>前端传入 user_id、face_id 和 face_name，服务端会按用户范围更新 Face 表中的姓名字段，
	 * 成功后返回更新后的 face_id / face_name。</p>
	 */
	@PostMapping("/remark")
	public ResponseEntity<ApiResponse<Map<String, Object>>> updateFaceRemark(@RequestBody FaceRemarkRequest request) {
		try {
			// 调用业务层完成名称备注更新。
			Face updated = faceService.updateFaceName(requireUserId(request.userId()), request.faceId(), request.faceName());
			Map<String, Object> payload = new LinkedHashMap<>();
			payload.put("status_code", "UPDATED");
			payload.put("face_id", updated.getId());
			payload.put("face_name", updated.getFaceName());
			return ResponseEntity.ok(ApiResponse.success(
				payload,
				"人物信息备注成功"
			));
		} catch (IllegalArgumentException e) {
			return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), "INVALID_PARAM"));
		} catch (NoSuchElementException e) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage(), "FACE_NOT_FOUND"));
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.body(ApiResponse.error("人物信息备注失败: " + e.getMessage(), "FACE_REMARK_FAILED"));
		}
	}

	/**
	 * 合并多个 face 相册。
	 *
	 * <p>前端必须传入 user_id。当 faceIds 中存在多个不同姓名且未提供 selectedName 时，返回候选姓名列表；
	 * 用户二次提交 selectedName 后执行真正合并。</p>
	 */
	@PostMapping("/merge")
	public ResponseEntity<ApiResponse<Map<String, Object>>> mergeFaces(@RequestBody FaceMergeRequest request) {
		try {
			FaceMergeService.FaceMergeResult result = faceService.mergeFaces(
				requireUserId(request.userId()),
				request.faceIds(),
				request.selectedName()
			);

			if (FaceMergeService.STATUS_NEED_NAME_SELECTION.equals(result.statusCode())) {
				return ResponseEntity.ok(ApiResponse.success(
					Map.of(
						"status_code", result.statusCode(),
						"candidate_names", result.candidateNames()
					),
					"检测到多个姓名，请先选择合并后姓名"
				));
			}

			Map<String, Object> payload = new LinkedHashMap<>();
			payload.put("status_code", result.statusCode());
			payload.put("merged_face_id", result.mergedFaceId());
			payload.put("merged_face_name", result.mergedFaceName());
			payload.put("moved_appearance_count", result.movedAppearanceCount());
			payload.put("removed_face_ids", result.removedFaceIds());

			return ResponseEntity.ok(ApiResponse.success(payload, "人脸相册合并成功"));
		} catch (IllegalArgumentException e) {
			return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), "INVALID_PARAM"));
		} catch (NoSuchElementException e) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage(), "FACE_NOT_FOUND"));
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.body(ApiResponse.error("人脸相册合并失败: " + e.getMessage(), "FACE_MERGE_FAILED"));
		}
	}

	/**
	 * 删除错误的人物分类。
	 *
	 * <p>前端必须传入 user_id。仅删除 face 分类与 face_appearances 关联，不删除图片本身。</p>
	 */
	@PostMapping("/delete")
	public ResponseEntity<ApiResponse<Map<String, Object>>> deleteFaceClassification(@RequestBody FaceDeleteRequest request) {
		try {
			FaceDeleteService.FaceDeleteResult result = faceService.deleteFaceClassification(requireUserId(request.userId()), request.faceId());

			return ResponseEntity.ok(ApiResponse.success(
				Map.of(
					"status_code", result.statusCode(),
					"removed_face_id", result.removedFaceId(),
					"removed_appearance_count", result.removedAppearanceCount()
				),
				"人物分类删除成功"
			));
		} catch (IllegalArgumentException e) {
			return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), "INVALID_PARAM"));
		} catch (NoSuchElementException e) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage(), "FACE_NOT_FOUND"));
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.body(ApiResponse.error("人物分类删除失败: " + e.getMessage(), "FACE_DELETE_FAILED"));
		}
	}

	/**
	 * 手动对某张已上传的图片进行人脸识别分析。
	 */
	@PostMapping("/analyze")
	public ResponseEntity<ApiResponse<Map<String, Object>>> analyzeImage(@RequestBody AnalyzeImageRequest request) {
		try {
			Integer userId = requireUserId(request.userId());
			File imageFile = imageService.getImageFile(request.imageId(), userId);
			if (imageFile == null || !imageFile.exists()) {
				return ResponseEntity.status(HttpStatus.NOT_FOUND)
					.body(ApiResponse.error("图片文件不存在", "IMAGE_NOT_FOUND"));
			}
			byte[] payload = Files.readAllBytes(imageFile.toPath());
			int faceCount = faceService.onImageUploaded(userId, request.imageId(), payload);
			return ResponseEntity.ok(ApiResponse.success(
				Map.of("image_id", request.imageId(), "face_count", faceCount),
				"人脸识别分析完成"
			));
		} catch (IllegalArgumentException e) {
			return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), "INVALID_PARAM"));
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.body(ApiResponse.error("人脸识别分析失败: " + e.getMessage(), "FACE_ANALYZE_FAILED"));
		}
	}

	/**
	 * 获取当前用户的全部人物分类列表。
	 */
	@GetMapping("/list")
	public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listFaces(@RequestParam Integer userId) {
		try {
			List<Face> faces = faceService.listFacesByUserId(requireUserId(userId));
			List<Map<String, Object>> payload = faces.stream().map(face -> {
				Map<String, Object> map = new LinkedHashMap<>();
				map.put("face_id", face.getId());
				map.put("face_name", face.getFaceName());
				map.put("cover_path", face.getCoverPath());
				map.put("last_seen_at", face.getLastSeenAt());
				map.put("created_at", face.getCreatedAt());
				return map;
			}).collect(Collectors.toList());
			return ResponseEntity.ok(ApiResponse.success(payload, "人物列表查询成功"));
		} catch (IllegalArgumentException e) {
			return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), "INVALID_PARAM"));
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.body(ApiResponse.error("人物列表查询失败: " + e.getMessage(), "FACE_LIST_FAILED"));
		}
	}

	/**
	 * 获取某个人物分类的封面裁剪图。
	 */
	@GetMapping("/{faceId}/cover")
	public ResponseEntity<byte[]> getFaceCover(
			@PathVariable Integer faceId,
			@RequestParam Integer userId) {
		try {
			Face face = faceRepository.findByIdAndUserId(faceId, requireUserId(userId))
					.orElseThrow(() -> new NoSuchElementException("Face not found"));
			File coverFile = resolveFaceCoverFile(face);
			if (coverFile == null || !coverFile.exists()) {
				return ResponseEntity.notFound().build();
			}
			byte[] imageBytes = Files.readAllBytes(coverFile.toPath());
			return ResponseEntity.ok()
					.contentType(MediaType.IMAGE_JPEG)
					.body(imageBytes);
		} catch (IllegalArgumentException | NoSuchElementException e) {
			return ResponseEntity.notFound().build();
		} catch (IOException e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
		}
	}

	private File resolveFaceCoverFile(Face face) {
		if (face.getCoverPath() != null && !face.getCoverPath().isBlank()) {
			File existing = new File(face.getCoverPath());
			if (existing.exists()) {
				return existing;
			}
		}

		java.util.List<FaceAppearance> appearances = faceAppearanceRepository.findByFaceIdOrderByCreatedAtDesc(face.getId());
		for (FaceAppearance appearance : appearances) {
			File imageFile = imageService.getImageFile(appearance.getImageId(), face.getUserId());
			if (imageFile == null || !imageFile.exists()) {
				continue;
			}

			try {
				String coverPath = faceRecognitionPersistenceService.ensureFaceCover(
					face.getUserId(),
					face.getCoverPath(),
					appearance.getBbox(),
					Files.readAllBytes(imageFile.toPath())
				);
				if (coverPath != null && !coverPath.isBlank()) {
					face.setCoverPath(coverPath);
					faceRepository.save(face);
					File regenerated = new File(coverPath);
					if (regenerated.exists()) {
						return regenerated;
					}
				}
			} catch (IOException ignored) {
				// Ignore and continue trying older appearances.
			}
		}

		return null;
	}

	/**
	 * 获取某个人物分类下的全部图片。
	 */
	@GetMapping("/{faceId}/images")
	public ResponseEntity<ApiResponse<List<Image>>> getFaceImages(
			@PathVariable Integer faceId,
			@RequestParam Integer userId) {
		try {
			List<Image> images = faceService.getImagesByFaceId(requireUserId(userId), faceId);
			return ResponseEntity.ok(ApiResponse.success(images, "人物图片查询成功"));
		} catch (IllegalArgumentException e) {
			return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), "INVALID_PARAM"));
		} catch (NoSuchElementException e) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage(), "FACE_NOT_FOUND"));
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.body(ApiResponse.error("人物图片查询失败: " + e.getMessage(), "FACE_IMAGES_FAILED"));
		}
	}

	/**
	 * 搜索某个人名对应的人物分类编号。
	 *
	 * <p>按 user_id + face_name 做精确匹配（大小写敏感），返回全部命中的分类编号。</p>
	 */
	@PostMapping("/search")
	public ResponseEntity<ApiResponse<Map<String, Object>>> searchFaceCategories(@RequestBody FaceSearchRequest request) {
		try {
			FaceService.FaceNameSearchResult result = faceService.searchFaceCategoryIds(request.userId(), request.faceName());
			return ResponseEntity.ok(ApiResponse.success(
				Map.of(
					"status_code", result.statusCode(),
					"category_ids", result.categoryIds()
				),
				"人物搜索成功"
			));
		} catch (IllegalArgumentException e) {
			return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), "INVALID_PARAM"));
		} catch (Exception e) {
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.body(ApiResponse.error("人物搜索失败: " + e.getMessage(), "FACE_SEARCH_FAILED"));
		}
	}

	/**
	 * 人脸搜索请求体。
	 * user_id：用户主键，必填；face_name：需要搜索的人物姓名（大小写敏感）。
	 */
	public record FaceSearchRequest(
		@JsonProperty("user_id") @JsonAlias("userId") Integer userId,
		@JsonProperty("face_name") @JsonAlias({"name", "faceName"}) String faceName
	) {
	}

	/**
	 * 人物备注请求体。
	 * user_id：用户主键，必填；face_id：人脸主键；face_name：用户填写的人物姓名。
	 */
	public record FaceRemarkRequest(
		@JsonProperty("user_id") @JsonAlias("userId") Integer userId,
		@JsonProperty("face_id") @JsonAlias("faceId") Integer faceId,
		@JsonProperty("face_name") @JsonAlias({"name", "faceName"}) String faceName
	) {
	}

	/**
	 * 人脸合并请求体。
	 * user_id：用户主键，必填；face_ids：待合并的人脸主键列表；selected_name：冲突时用户最终选择的人名。
	 */
	public record FaceMergeRequest(
		@JsonProperty("user_id") @JsonAlias("userId") Integer userId,
		@JsonProperty("face_ids") @JsonAlias("faceIds") List<Integer> faceIds,
		@JsonProperty("selected_name") @JsonAlias({"selectedName", "face_name", "faceName"}) String selectedName
	) {
	}

	/**
	 * 人脸删除请求体。
	 * user_id：用户主键，必填；face_id：待删除的人脸主键。
	 */
	public record FaceDeleteRequest(
		@JsonProperty("user_id") @JsonAlias("userId") Integer userId,
		@JsonProperty("face_id") @JsonAlias("faceId") Integer faceId
	) {
	}

	/**
	 * 手动分析图片请求体。
	 * user_id：用户主键，必填；image_id：已上传图片的主键。
	 */
	public record AnalyzeImageRequest(
		@JsonProperty("user_id") @JsonAlias("userId") Integer userId,
		@JsonProperty("image_id") @JsonAlias("imageId") String imageId
	) {
	}

	private Integer requireUserId(Integer userId) {
		if (userId == null || userId <= 0) {
			throw new IllegalArgumentException("userId is invalid");
		}
		return userId;
	}
}
