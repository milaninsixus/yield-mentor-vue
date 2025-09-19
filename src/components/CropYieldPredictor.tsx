import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, MapPin, Wifi, WifiOff, Camera, TrendingUp, Droplets, Zap, Bug, Calendar as CalendarIcon, Wheat, Info } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// Interfaces
interface PredictionData {
  cropName: string;
  variety: string;
  sowingDate: Date | null;
  farmLocation: { lat: number; lon: number; name: string } | null;
  farmSize: { value: number; unit: string };
  soilType: string;
  soilPH: number | null;
  nLevel: number | null;
  pLevel: number | null;
  kLevel: number | null;
  irrigationSource: string;
  lastIrrigationDate: Date | null;
  fertilizersUsed: string[];
  pestObserved: boolean;
  pestPhoto?: File;
}

interface PredictionResult {
  predictedYield: { value: number; unit: string };
  confidenceInterval: { min: number; max: number };
  recommendations: Array<{ type: string; title: string; description: string; icon: string }>;
  explanation: string;
  isOffline?: boolean;
}

interface CropYieldPredictorProps {
  onPredict?: (payload: PredictionData) => void;
  onSave?: (data: PredictionData) => void;
}

// Sample data
const CROPS = [
  'Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane', 'Soybean', 'Groundnut', 'Sunflower', 'Mustard', 'Barley'
];

const SOIL_TYPES = [
  'Clay', 'Sandy', 'Loamy', 'Silt', 'Peat', 'Chalk', 'Sandy Clay', 'Clay Loam', 'Sandy Loam', 'Silt Clay'
];

const IRRIGATION_SOURCES = [
  'Rain-fed', 'Tube well', 'Canal', 'River', 'Pond', 'Sprinkler', 'Drip', 'Mixed sources'
];

const COMMON_FERTILIZERS = [
  'Urea', 'DAP', 'NPK', 'Potash', 'SSP', 'Compost', 'Vermicompost', 'FYM', 'Lime', 'Gypsum'
];

const FARM_SIZE_UNITS = ['Hectares', 'Acres', 'Bigha', 'Katha', 'Guntha'];

// Localization (simplified implementation)
const translations = {
  en: {
    title: 'Crop Yield Predictor',
    subtitle: 'Get AI-powered yield predictions for your farm',
    cropName: 'Crop Name',
    variety: 'Variety',
    sowingDate: 'Sowing Date',
    farmLocation: 'Farm Location',
    farmSize: 'Farm Size',
    soilType: 'Soil Type',
    soilPH: 'Soil pH',
    nutrientLevels: 'Nutrient Levels (Optional)',
    nitrogen: 'Nitrogen (N)',
    phosphorus: 'Phosphorus (P)',
    potassium: 'Potassium (K)',
    irrigation: 'Irrigation Details',
    irrigationSource: 'Irrigation Source',
    lastIrrigation: 'Last Irrigation Date',
    fertilizers: 'Fertilizers Used',
    pestControl: 'Pest Observation',
    pestObserved: 'Pests Observed?',
    uploadPhoto: 'Upload Pest Photo',
    predict: 'Predict Yield',
    save: 'Save Data',
    detecting: 'Detecting location...',
    offline: 'Offline Mode',
    results: 'Prediction Results',
    recommendations: 'Recommendations',
    confidence: 'Confidence',
    explanation: 'Explanation'
  },
  hi: {
    title: 'फसल उत्पादन भविष्यवाणी',
    subtitle: 'अपने खेत के लिए AI-संचालित उत्पादन पूर्वानुमान प्राप्त करें',
    cropName: 'फसल का नाम',
    variety: 'किस्म',
    sowingDate: 'बुआई की तारीख',
    farmLocation: 'खेत का स्थान',
    farmSize: 'खेत का आकार',
    soilType: 'मिट्टी का प्रकार',
    soilPH: 'मिट्टी का pH',
    nutrientLevels: 'पोषक तत्व स्तर (वैकल्पिक)',
    nitrogen: 'नाइट्रोजन (N)',
    phosphorus: 'फास्फोरस (P)',
    potassium: 'पोटेशियम (K)',
    irrigation: 'सिंचाई विवरण',
    irrigationSource: 'सिंचाई का स्रोत',
    lastIrrigation: 'अंतिम सिंचाई की तारीख',
    fertilizers: 'उपयोग किए गए उर्वरक',
    pestControl: 'कीट निरीक्षण',
    pestObserved: 'कीट देखे गए?',
    uploadPhoto: 'कीट फोटो अपलोड करें',
    predict: 'उत्पादन की भविष्यवाणी करें',
    save: 'डेटा सहेजें',
    detecting: 'स्थान खोजा जा रहा है...',
    offline: 'ऑफलाइन मोड',
    results: 'भविष्यवाणी परिणाम',
    recommendations: 'सुझाव',
    confidence: 'विश्वसनीयता',
    explanation: 'व्याख्या'
  }
};

export const CropYieldPredictor: React.FC<CropYieldPredictorProps> = ({ onPredict, onSave }) => {
  // State management
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [data, setData] = useState<PredictionData>({
    cropName: '',
    variety: '',
    sowingDate: null,
    farmLocation: null,
    farmSize: { value: 0, unit: 'Hectares' },
    soilType: '',
    soilPH: null,
    nLevel: null,
    pLevel: null,
    kLevel: null,
    irrigationSource: '',
    lastIrrigationDate: null,
    fertilizersUsed: [],
    pestObserved: false,
  });
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [selectedFertilizers, setSelectedFertilizers] = useState<string[]>([]);

  const t = translations[language];

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // GPS Location detection
  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support location detection",
        variant: "destructive"
      });
      return;
    }

    setIsLocating(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Simulate reverse geocoding (replace with actual API call)
      const locationName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      
      setData(prev => ({
        ...prev,
        farmLocation: { lat: latitude, lon: longitude, name: locationName }
      }));

      // Auto-fetch weather and soil data
      if (isOnline) {
        await Promise.all([
          fetchWeatherData(latitude, longitude),
          fetchSoilData(latitude, longitude)
        ]);
      }
      
      toast({
        title: "Location detected",
        description: `Farm location set to ${locationName}`,
      });
    } catch (error) {
      toast({
        title: "Location error",
        description: "Could not detect your location. Please select manually.",
        variant: "destructive"
      });
    } finally {
      setIsLocating(false);
    }
  }, [isOnline]);

  // API calls (mock implementations)
  const fetchWeatherData = async (lat: number, lon: number) => {
    try {
      // TODO: Replace with actual API call to /api/weather?lat=${lat}&lon=${lon}
      const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      const weatherData = await response.json();
      console.log('Weather data:', weatherData);
    } catch (error) {
      console.error('Weather fetch error:', error);
    }
  };

  const fetchSoilData = async (lat: number, lon: number) => {
    try {
      // TODO: Replace with actual API call to /api/soil?lat=${lat}&lon=${lon}
      const response = await fetch(`/api/soil?lat=${lat}&lon=${lon}`);
      const soilData = await response.json();
      console.log('Soil data:', soilData);
    } catch (error) {
      console.error('Soil fetch error:', error);
    }
  };

  // Handle form submission
  const handlePredict = async () => {
    // Validation
    if (!data.cropName || !data.soilType || !data.farmSize.value) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Mock prediction result (replace with actual ML model call)
      const mockResult: PredictionResult = {
        predictedYield: { value: 4.2, unit: 'tonnes/hectare' },
        confidenceInterval: { min: 3.8, max: 4.6 },
        recommendations: [
          {
            type: 'irrigation',
            title: 'Optimize Irrigation',
            description: 'Increase irrigation frequency by 20% during flowering stage',
            icon: 'droplets'
          },
          {
            type: 'fertilization',
            title: 'Nitrogen Boost',
            description: 'Apply additional 15kg/ha nitrogen in the next 2 weeks',
            icon: 'zap'
          },
          {
            type: 'pest',
            title: 'Pest Monitoring',
            description: 'Monitor for aphids and apply organic neem spray if needed',
            icon: 'bug'
          }
        ],
        explanation: `Based on your ${data.cropName} variety, soil conditions, and current weather patterns, we predict a yield of 4.2 tonnes per hectare. The soil pH of ${data.soilPH} is optimal for this crop. Consider the recommendations above to potentially increase yield by 8-12%.`,
        isOffline: !isOnline
      };

      setResult(mockResult);
      onPredict?.(data);
    } catch (error) {
      toast({
        title: "Prediction error",
        description: "Could not generate prediction. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    onSave?.(data);
    toast({
      title: "Data saved",
      description: "Your farm data has been saved successfully",
    });
  };

  const toggleFertilizer = (fertilizer: string) => {
    const updated = selectedFertilizers.includes(fertilizer)
      ? selectedFertilizers.filter(f => f !== fertilizer)
      : [...selectedFertilizers, fertilizer];
    
    setSelectedFertilizers(updated);
    setData(prev => ({ ...prev, fertilizersUsed: updated }));
  };

  const IconComponent = ({ name }: { name: string }) => {
    const icons: Record<string, React.ReactNode> = {
      droplets: <Droplets className="h-4 w-4" />,
      zap: <Zap className="h-4 w-4" />,
      bug: <Bug className="h-4 w-4" />
    };
    return <>{icons[name] || <Info className="h-4 w-4" />}</>;
  };

  return (
    <div className="min-h-screen bg-gradient-earth">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wheat className="h-8 w-8 text-farm-green" />
              <h1 className="text-3xl font-bold text-foreground">{t.title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isOnline ? "default" : "secondary"} className="gap-1">
                {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isOnline ? 'Online' : t.offline}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              >
                {language === 'en' ? 'हिं' : 'EN'}
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="space-y-6">
            {/* Crop Information */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wheat className="h-5 w-5 text-farm-green" />
                  Crop Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="crop" className="text-sm font-medium">{t.cropName} *</Label>
                  <Select value={data.cropName} onValueChange={(value) => setData(prev => ({ ...prev, cropName: value }))}>
                    <SelectTrigger id="crop" className="mt-1">
                      <SelectValue placeholder="Select crop" />
                    </SelectTrigger>
                    <SelectContent>
                      {CROPS.map(crop => (
                        <SelectItem key={crop} value={crop}>{crop}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="variety" className="text-sm font-medium">{t.variety}</Label>
                  <Input
                    id="variety"
                    value={data.variety}
                    onChange={(e) => setData(prev => ({ ...prev, variety: e.target.value }))}
                    placeholder="Enter variety name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">{t.sowingDate}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full mt-1 justify-start text-left font-normal",
                          !data.sowingDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {data.sowingDate ? format(data.sowingDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={data.sowingDate || undefined}
                        onSelect={(date) => setData(prev => ({ ...prev, sowingDate: date || null }))}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>

            {/* Farm Location & Size */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-farm-green" />
                  Farm Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">{t.farmLocation}</Label>
                  <div className="flex gap-2 mt-1">
                    <Button
                      variant="outline"
                      onClick={detectLocation}
                      disabled={isLocating}
                      className="flex-1"
                    >
                      {isLocating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <MapPin className="mr-2 h-4 w-4" />
                      )}
                      {isLocating ? t.detecting : 'Detect GPS'}
                    </Button>
                  </div>
                  {data.farmLocation && (
                    <p className="text-sm text-muted-foreground mt-2">
                      📍 {data.farmLocation.name}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Label htmlFor="farm-size" className="text-sm font-medium">{t.farmSize} *</Label>
                    <Input
                      id="farm-size"
                      type="number"
                      value={data.farmSize.value || ''}
                      onChange={(e) => setData(prev => ({ 
                        ...prev, 
                        farmSize: { ...prev.farmSize, value: parseFloat(e.target.value) || 0 }
                      }))}
                      placeholder="0"
                      className="mt-1"
                      min="0"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Unit</Label>
                    <Select 
                      value={data.farmSize.unit} 
                      onValueChange={(value) => setData(prev => ({ 
                        ...prev, 
                        farmSize: { ...prev.farmSize, unit: value }
                      }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FARM_SIZE_UNITS.map(unit => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Soil Information */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Soil Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">{t.soilType} *</Label>
                  <Select value={data.soilType} onValueChange={(value) => setData(prev => ({ ...prev, soilType: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select soil type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOIL_TYPES.map(soil => (
                        <SelectItem key={soil} value={soil}>{soil}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="soil-ph" className="text-sm font-medium">{t.soilPH}</Label>
                  <Input
                    id="soil-ph"
                    type="number"
                    value={data.soilPH || ''}
                    onChange={(e) => setData(prev => ({ ...prev, soilPH: parseFloat(e.target.value) || null }))}
                    placeholder="6.5"
                    className="mt-1"
                    min="0"
                    max="14"
                    step="0.1"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">{t.nutrientLevels}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor="n-level" className="text-xs text-muted-foreground">{t.nitrogen}</Label>
                      <Input
                        id="n-level"
                        type="number"
                        value={data.nLevel || ''}
                        onChange={(e) => setData(prev => ({ ...prev, nLevel: parseFloat(e.target.value) || null }))}
                        placeholder="N"
                        className="mt-1"
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="p-level" className="text-xs text-muted-foreground">{t.phosphorus}</Label>
                      <Input
                        id="p-level"
                        type="number"
                        value={data.pLevel || ''}
                        onChange={(e) => setData(prev => ({ ...prev, pLevel: parseFloat(e.target.value) || null }))}
                        placeholder="P"
                        className="mt-1"
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="k-level" className="text-xs text-muted-foreground">{t.potassium}</Label>
                      <Input
                        id="k-level"
                        type="number"
                        value={data.kLevel || ''}
                        onChange={(e) => setData(prev => ({ ...prev, kLevel: parseFloat(e.target.value) || null }))}
                        placeholder="K"
                        className="mt-1"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Irrigation & Management */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-farm-green" />
                  {t.irrigation}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">{t.irrigationSource}</Label>
                  <Select value={data.irrigationSource} onValueChange={(value) => setData(prev => ({ ...prev, irrigationSource: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select irrigation source" />
                    </SelectTrigger>
                    <SelectContent>
                      {IRRIGATION_SOURCES.map(source => (
                        <SelectItem key={source} value={source}>{source}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">{t.lastIrrigation}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full mt-1 justify-start text-left font-normal",
                          !data.lastIrrigationDate && "text-muted-foreground"
                        )}
                      >
                        <Droplets className="mr-2 h-4 w-4" />
                        {data.lastIrrigationDate ? format(data.lastIrrigationDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={data.lastIrrigationDate || undefined}
                        onSelect={(date) => setData(prev => ({ ...prev, lastIrrigationDate: date || null }))}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">{t.fertilizers}</Label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_FERTILIZERS.map(fertilizer => (
                      <Badge
                        key={fertilizer}
                        variant={selectedFertilizers.includes(fertilizer) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleFertilizer(fertilizer)}
                      >
                        {fertilizer}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{t.pestObserved}</Label>
                    <Switch
                      checked={data.pestObserved}
                      onCheckedChange={(checked) => setData(prev => ({ ...prev, pestObserved: checked }))}
                    />
                  </div>
                  
                  {data.pestObserved && (
                    <div>
                      <Label htmlFor="pest-photo" className="text-sm text-muted-foreground">{t.uploadPhoto}</Label>
                      <Button variant="outline" className="w-full mt-1 justify-start">
                        <Camera className="mr-2 h-4 w-4" />
                        Take Photo
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handlePredict}
                disabled={isLoading}
                className="flex-1 bg-gradient-farm hover:opacity-90 text-primary-foreground shadow-farm"
                size="lg"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TrendingUp className="mr-2 h-4 w-4" />
                )}
                {t.predict}
              </Button>
              <Button
                onClick={handleSave}
                variant="outline"
                size="lg"
              >
                {t.save}
              </Button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {result ? (
              <>
                <Card className="shadow-farm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-success" />
                      {t.results}
                      {result.isOffline && (
                        <Badge variant="secondary" className="ml-2">
                          <WifiOff className="h-3 w-3 mr-1" />
                          Cached
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center p-6 bg-gradient-earth rounded-lg">
                      <div className="text-4xl font-bold text-success mb-2">
                        {result.predictedYield.value} {result.predictedYield.unit}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t.confidence}: {result.confidenceInterval.min} - {result.confidenceInterval.max}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        {t.recommendations}
                      </h4>
                      <div className="space-y-3">
                        {result.recommendations.map((rec, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="p-2 rounded-full bg-primary/10">
                              <IconComponent name={rec.icon} />
                            </div>
                            <div className="flex-1">
                              <h5 className="font-medium text-sm">{rec.title}</h5>
                              <p className="text-sm text-muted-foreground">{rec.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2">{t.explanation}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {result.explanation}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="shadow-soft">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Wheat className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Ready to Predict</h3>
                  <p className="text-muted-foreground">
                    Fill in your farm details and click "Predict Yield" to get AI-powered insights
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};