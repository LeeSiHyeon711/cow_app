import React, { useState } from "react";
import { View, Button, Image, Text, StyleSheet, Alert, ActivityIndicator } from "react-native";
import * as ImagePicker from "react-native-image-picker";
import axios from "axios";

const App = () => {
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [prediction, setPrediction] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // ✅ 이미지 선택 함수
    const pickImage = () => {
        ImagePicker.launchImageLibrary({ mediaType: "photo" }, (response) => {
            if (response.didCancel) {
                console.log("⚠️ 이미지 선택 취소됨");
                return;
            }
            if (response.errorMessage) {
                console.error("❌ 이미지 선택 오류:", response.errorMessage);
                Alert.alert("오류", response.errorMessage);
                return;
            }
            if (response.assets && response.assets.length > 0) {
                const selectedImage = response.assets[0];
                setImageUri(selectedImage.uri ?? null);
                uploadImage(selectedImage);
            }
        });
    };

    // ✅ Django 서버로 이미지 업로드 & 판정 요청
    const uploadImage = async (image: ImagePicker.Asset) => {
        setLoading(true); // 로딩 시작
        setPrediction(null); // 기존 예측 초기화
        setErrorMessage(null); // 기존 오류 초기화

        const formData = new FormData();
        formData.append("image", {
            uri: image.uri ?? "",  // ✅ undefined 방지 (기본값 "")
            type: "image/jpeg",
            name: "upload.jpg",
        });

        try {
            console.log("🚀 Django 서버로 요청 전송 시작...");
            const response = await axios.post("http://192.168.45.201:8000/predict/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
    
            console.log("✅ 서버 응답:", response.data);
            setPrediction(response.data);
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                console.error("❌ Axios 네트워크 오류:", error.message);
            } else {
                console.error("❌ 알 수 없는 오류 발생:", error);
            }
        } finally {
            setLoading(false); // ✅ 로딩 종료
        }
    };

    return (
        <View style={styles.container}>
            {/* 이미지 선택 버튼 */}
            <Button title="이미지 선택" onPress={pickImage} color="#007AFF" />

            {/* 선택한 이미지 표시 */}
            {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}

            {/* 로딩 표시 */}
            {loading && <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />}

            {/* 예측 결과 출력 */}
            {prediction && (
                <View style={styles.resultContainer}>
                    <Text style={styles.resultText}>🐄 예측 등급: {prediction.predicted_class}</Text>
                    <Text style={styles.probabilityText}>확률: {(prediction.predicted_probability * 100).toFixed(2)}%</Text>

                    <Text style={styles.headerText}>📊 등급별 확률</Text>
                    {prediction.all_predictions.map((item: any, index: number) => (
                        <Text key={index} style={styles.probabilityText}>
                            {item.class}: {(item.probability * 100).toFixed(2)}%
                        </Text>
                    ))}
                </View>
            )}

            {/* 오류 메시지 표시 */}
            {errorMessage && <Text style={styles.errorText}>❌ {errorMessage}</Text>}
        </View>
    );
};

// ✅ 스타일 적용 (더 보기 좋게)
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F5F5F5",
        paddingHorizontal: 20,
    },
    image: {
        width: 250,
        height: 250,
        marginTop: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: "#007AFF",
    },
    resultContainer: {
        marginTop: 20,
        backgroundColor: "#FFFFFF",
        padding: 15,
        borderRadius: 10,
        elevation: 3,
        width: "90%",
        alignItems: "center",
    },
    resultText: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#333",
    },
    probabilityText: {
        fontSize: 18,
        color: "#444",
    },
    headerText: {
        marginTop: 10,
        fontSize: 20,
        fontWeight: "bold",
        color: "#007AFF",
    },
    errorText: {
        marginTop: 20,
        fontSize: 18,
        color: "red",
        fontWeight: "bold",
    },
});

export default App;
