import { CropYieldPredictor } from '@/components/CropYieldPredictor';
import { SEO } from '@/components/SEO';

const Index = () => {
  const handlePredict = (payload: any) => {
    console.log('Prediction requested:', payload);
    // TODO: Connect to ML model API
  };

  const handleSave = (data: any) => {
    console.log('Data save requested:', data);
    // TODO: Connect to database
  };

  return (
    <>
      <SEO 
        title="AI Crop Yield Predictor - Smart Farming Solutions"
        description="Get accurate crop yield predictions using AI. Mobile-friendly tool for farmers with GPS location, weather integration, and multilingual support."
        keywords="crop yield prediction, smart farming, agriculture AI, farm management, yield forecasting"
      />
      <CropYieldPredictor onPredict={handlePredict} onSave={handleSave} />
    </>
  );
};

export default Index;
