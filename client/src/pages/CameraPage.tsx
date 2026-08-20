import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import {
  AlertCircle,
  Camera as CameraIcon,
  Check,
  RefreshCw as LoopIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import AnimatedCheckmark from "@/components/AnimatedCheckmark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/hooks/useLanguage";
import { trpc } from "@/lib/trpc";
import type { EmotionalState } from "../../../shared/types";
import { STATE_COLORS } from "../../../shared/types";

type UploadState = "idle" | "uploading" | "processing" | "success" | "error";

const E2E_TEST_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9JDsYAAAAASUVORK5CYII=";
const isE2ETestBuild = import.meta.env.VITE_E2E === "true";

export default function CameraPage() {
  const { t, language } = useLanguage();
  const [, _setLocation] = useLocation();
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [classificationResult, setClassificationResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: activeAnimal } = trpc.animals.getActive.useQuery();
  const saveVisionMutation = trpc.classify.saveVisionEvent.useMutation();

  const openCamera = async () => {
    // Browser E2E has no physical camera. The test-only build injects a
    // deterministic image, while normal web and native builds use Capacitor.
    if (isE2ETestBuild) {
      setCapturedImage(E2E_TEST_IMAGE);
      setUploadState("idle");
      setErrorMessage(null);
      return;
    }

    try {
      const image = await Camera.getPhoto({
        quality: 60,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
      });

      if (image.base64String) {
        setCapturedImage(
          `data:image/${image.format};base64,${image.base64String}`,
        );
        setUploadState("idle");
        setErrorMessage(null);
      }
    } catch (err: any) {
      if (
        err.message !== "User cancelled photos app" &&
        err.message !== "User cancelled"
      ) {
        console.error("Camera error:", err);
        setErrorMessage(
          language === "pt"
            ? "Erro ao abrir a câmara."
            : "Error opening camera.",
        );
        toast.error(err.message);
      }
    }
  };

  const handleRetry = () => {
    setCapturedImage(null);
    setClassificationResult(null);
    setUploadState("idle");
    setUploadProgress(0);
    void openCamera();
  };

  const handleDelete = () => {
    setCapturedImage(null);
    setClassificationResult(null);
    setUploadState("idle");
    setUploadProgress(0);
    setErrorMessage(null);
  };

  const handleConfirm = async () => {
    if (!capturedImage) return;
    if (!activeAnimal) {
      toast.error(
        language === "pt"
          ? "Selecione ou crie um animal ativo no perfil primeiro."
          : "Please select or create an active pet in profile first.",
      );
      return;
    }

    setUploadState("uploading");
    setUploadProgress(0);

    const duration = 1200;
    const step = 10;
    const increment = 100 / (duration / step);
    let currentProgress = 0;

    const interval = setInterval(() => {
      currentProgress = Math.min(100, currentProgress + increment);
      setUploadProgress(Math.round(currentProgress));
      if (currentProgress >= 100) {
        clearInterval(interval);
        setUploadState("processing");
        sendToClassification();
      }
    }, step);
  };

  const sendToClassification = () => {
    if (!capturedImage || !activeAnimal) return;

    const base64Image = capturedImage.split(",")[1];

    saveVisionMutation.mutate(
      {
        animalId: activeAnimal.id,
        posture: "sitting",
        image: base64Image,
      },
      {
        onSuccess: (data) => {
          setClassificationResult(data);
          setUploadState("success");
          toast.success(
            language === "pt"
              ? "Análise visual concluída!"
              : "Visual analysis completed!",
          );
        },
        onError: (err) => {
          console.error("Save vision event failed:", err);
          setUploadState("error");
          const isNetError =
            !navigator.onLine ||
            err.message?.toLowerCase().includes("network") ||
            err.message?.toLowerCase().includes("failed to fetch") ||
            err.message?.toLowerCase().includes("offline");
          setErrorMessage(
            isNetError
              ? language === "pt"
                ? "Ligação interrompida. Tentar novamente."
                : "Connection interrupted. Try again."
              : language === "pt"
                ? "Não foi possível analisar o ficheiro. Tenta novamente."
                : "Could not analyze the file. Try again.",
          );
        },
      },
    );
  };

  return (
    <div className="page-enter min-h-full px-4 pt-4 pb-6 max-w-lg mx-auto flex flex-col justify-between h-[calc(100vh-4.5rem)]">
      <div className="flex-1 flex flex-col justify-center my-4 relative rounded-3xl overflow-hidden bg-slate-950 border border-border/40 shadow-inner min-h-[300px]">
        <AnimatePresence mode="wait">
          {capturedImage ? (
            <motion.div
              key="review"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full flex flex-col justify-between p-4 bg-slate-900"
            >
              <div className="flex-1 flex items-center justify-center overflow-hidden rounded-2xl border border-white/5 relative">
                <img
                  src={capturedImage}
                  alt="Captured review"
                  className="w-full h-full object-cover"
                />

                {uploadState === "uploading" && (
                  <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-6"
                    aria-live="polite"
                  >
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                      {language === "pt" ? "A enviar..." : "Uploading..."}
                    </span>
                    <Progress
                      value={uploadProgress}
                      className="w-full max-w-[200px] bg-white/10"
                    />
                    <span className="text-xs text-white mt-1.5 font-bold">
                      {uploadProgress}%
                    </span>
                  </div>
                )}

                {uploadState === "processing" && (
                  <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-6"
                    aria-live="polite"
                  >
                    <LoopIcon className="w-8 h-8 text-primary animate-spin mb-3" />
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      {language === "pt" ? "A processar..." : "Processing..."}
                    </span>
                  </div>
                )}

                {uploadState === "success" && classificationResult && (
                  <div
                    className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center p-6"
                    aria-live="polite"
                  >
                    <AnimatedCheckmark size={56} className="mb-3" />
                    <span className="text-base font-bold text-foreground">
                      {language === "pt" ? "Concluído!" : "Success!"}
                    </span>
                    <Badge className="mt-2 text-xl px-3 py-1.5 bg-card/80 border border-border/50 text-foreground flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full inline-block shrink-0 animate-pulse"
                        style={{
                          backgroundColor:
                            STATE_COLORS[
                              classificationResult.state as EmotionalState
                            ],
                        }}
                      />
                      <span>
                        {t(
                          `states.${classificationResult.state}` as any,
                        )?.toUpperCase() ||
                          classificationResult.state.toUpperCase()}
                      </span>
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Confiança:{" "}
                      {Math.round(classificationResult.confidence * 100)}%
                    </p>
                  </div>
                )}

                {uploadState === "error" && (
                  <div
                    className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center"
                    aria-live="polite"
                  >
                    <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
                    <span className="text-sm font-semibold text-rose-400">
                      {language === "pt" ? "Erro" : "Error"}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[220px] leading-relaxed">
                      {errorMessage}
                    </p>
                  </div>
                )}
              </div>

              {uploadState === "idle" && (
                <div className="flex gap-3 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDelete}
                    className="flex-1 text-xs font-semibold h-11 border-white/10 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    {language === "pt" ? "Eliminar" : "Delete"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRetry}
                    className="flex-1 text-xs font-semibold h-11 border-white/10"
                  >
                    {language === "pt" ? "Repetir" : "Retry"}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirm}
                    className="flex-1 text-xs font-semibold h-11 bg-primary text-primary-foreground hover:bg-emerald-600 shadow-md shadow-primary/20"
                  >
                    {language === "pt" ? "Confirmar" : "Confirm"}
                  </Button>
                </div>
              )}

              {(uploadState === "success" || uploadState === "error") && (
                <Button
                  type="button"
                  onClick={handleRetry}
                  variant="outline"
                  className="w-full text-xs font-semibold h-11 mt-4 border-white/10"
                >
                  {uploadState === "success"
                    ? language === "pt"
                      ? "Tirar outra foto"
                      : "Take another photo"
                    : language === "pt"
                      ? "Tentar novamente"
                      : "Try again"}
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="stream"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full flex flex-col justify-between"
            >
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <CameraIcon className="w-10 h-10 text-muted-foreground animate-pulse mb-1" />
                <h3 className="font-bold text-foreground text-sm">
                  {language === "pt" ? "Tirar Foto" : "Take a Photo"}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                  {language === "pt"
                    ? "Pressione o botão abaixo para abrir a câmara nativa ou escolher da galeria."
                    : "Press the button below to open the native camera or choose from gallery."}
                </p>
                <Button
                  type="button"
                  onClick={openCamera}
                  className="bg-primary text-primary-foreground font-semibold text-xs h-10 px-5 rounded-xl active-scale"
                >
                  {language === "pt"
                    ? "Abrir Câmara / Galeria"
                    : "Open Camera / Gallery"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-secondary/25 border border-border/40 rounded-2xl p-3 text-center">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          {language === "pt"
            ? "A IA do PeloNaRoupa analisa as posturas corporais e correlaciona-as com sentimentos de relaxamento, angústia ou brincadeira."
            : "PeloNaRoupa AI analyzes body postures and correlates them with feelings of relaxation, distress or play."}
        </p>
      </div>
    </div>
  );
}
