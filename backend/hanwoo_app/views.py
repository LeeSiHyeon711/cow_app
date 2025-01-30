from django.http import JsonResponse
import torch
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image
import io
import os

# ✅ 이미지 전처리 설정
transform_test = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# ✅ 모델 불러오기
class FineTunedResNet(torch.nn.Module):
    def __init__(self, num_classes):
        super(FineTunedResNet, self).__init__()
        self.base_model = torch.hub.load("pytorch/vision:v0.10.0", "resnet18", pretrained=True)
        self.base_model.fc = torch.nn.Linear(self.base_model.fc.in_features, num_classes)

    def forward(self, x):
        return self.base_model(x)

# ✅ 모델 로드
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = FineTunedResNet(num_classes=5).to(device)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
model_path = os.path.join(BASE_DIR, "hanwoo_app", "model", "NC_model_2.4.pth")

checkpoint = torch.load(model_path, map_location=device, weights_only=True)
model.load_state_dict(checkpoint)
model.eval()

# ✅ 예측 API
def predict(request):
    print("📸 [DEBUG] 이미지 요청 들어옴!")

    if request.method == "POST" and request.FILES.get("image"):
        image = request.FILES["image"]
        print(f"📂 [DEBUG] 이미지 파일 수신 완료: {image.name}")

        try:
            image_bytes = image.read()
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            processed_image = transform_test(image).unsqueeze(0).to(device)

            with torch.no_grad():
                outputs = model(processed_image)
                probabilities = F.softmax(outputs, dim=1).cpu().squeeze().numpy()

            class_names = ["1++등급", "1+등급", "1등급", "2등급", "3등급"]
            predicted_idx = probabilities.argmax()
            predicted_class = class_names[predicted_idx]

            print(f"✅ [DEBUG] 예측 완료: {predicted_class}")
            return JsonResponse({
                "predicted_class": predicted_class,
                "predicted_probability": float(probabilities[predicted_idx]),  # float 변환
                "all_predictions": [
                    {"class": class_names[idx], "probability": float(probabilities[idx])}
                    for idx in range(len(class_names))
                ],
            })

        except Exception as e:
            print(f"❌ [ERROR] 모델 실행 중 오류 발생: {e}")
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Invalid request"}, status=400)
