import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ZoomableImage component (unchanged)
const ZoomableImage = ({ src, alt }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [imageRect, setImageRect] = useState({ width: 0, height: 0, top: 0, left: 0 });
  const imageRef = React.useRef(null);
  const lensSize = 600;
  const zoomLevel = .3;

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setNaturalSize({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
  }, [src]);

  useEffect(() => {
    if (imageRef.current) {
      const updateImageRect = () => {
        const rect = imageRef.current.getBoundingClientRect();
        setImageRect({
          width: rect.width,
          height: rect.height,
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX
        });
      };

      updateImageRect();
      window.addEventListener('resize', updateImageRect);
      window.addEventListener('scroll', updateImageRect);

      return () => {
        window.removeEventListener('resize', updateImageRect);
        window.removeEventListener('scroll', updateImageRect);
      };
    }
  }, [imageRef.current]);

  const handleMouseMove = (e) => {
    if (imageRef.current) {
      const x = e.pageX - imageRect.left;
      const y = e.pageY - imageRect.top;

      if (x >= 0 && x <= imageRect.width && y >= 0 && y <= imageRect.height) {
        const displayRatio = imageRect.width / imageRect.height;
        const naturalRatio = naturalSize.width / naturalSize.height;
        
        let scaledImageWidth, scaledImageHeight, imageLeft, imageTop;
        
        if (displayRatio > naturalRatio) {
          scaledImageHeight = imageRect.height;
          scaledImageWidth = (naturalSize.width * imageRect.height) / naturalSize.height;
          imageLeft = (imageRect.width - scaledImageWidth) / 2;
          imageTop = 0;
        } else {
          scaledImageWidth = imageRect.width;
          scaledImageHeight = (naturalSize.height * imageRect.width) / naturalSize.width;
          imageLeft = 0;
          imageTop = (imageRect.height - scaledImageHeight) / 2;
        }

        const adjustedX = x - imageLeft;
        const adjustedY = y - imageTop;

        const xPercent = (adjustedX / scaledImageWidth) * 100;
        const yPercent = (adjustedY / scaledImageHeight) * 100;

        const realX = (xPercent / 100) * naturalSize.width;
        const realY = (yPercent / 100) * naturalSize.height;

        setMousePosition({
          x: xPercent,
          y: yPercent,
          realX,
          realY
        });
      }
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <img 
        ref={imageRef}
        src={src} 
        alt={alt} 
        className="max-w-full max-h-full object-contain"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onMouseMove={handleMouseMove}
      />
      
      {isHovering && mousePosition.x >= 0 && mousePosition.x <= 100 && mousePosition.y >= 0 && mousePosition.y <= 100 && (
        <div 
          className="absolute pointer-events-none border-2 border-gray-300 rounded-full bg-white overflow-hidden z-50"
          style={{
            width: `${lensSize}px`,
            height: `${lensSize}px`,
            left: `${mousePosition.x}%`,
            top: `${mousePosition.y}%`,
            transform: `translate(-50%, -50%)`,
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
          }}
        >
          <div
            className="absolute w-full h-full"
            style={{
              backgroundImage: `url(${src})`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: `${-mousePosition.realX * zoomLevel + lensSize/2}px ${-mousePosition.realY * zoomLevel + lensSize/2}px`,
              backgroundSize: `${naturalSize.width * zoomLevel}px ${naturalSize.height * zoomLevel}px`,
            }}
          />
        </div>
      )}
    </div>
  );
};

const formatPercent = (value) => `${(value * 100).toFixed(1)}%`;
const formatCurrency = (value) => `$${value.toFixed(4)}`;
const formatTime = (value) => `${value.toFixed(1)}s`;

const ModelComparisonChart = ({ data, metric, formatValue = (v) => v }) => {
  const chartData = Object.entries(data || {}).map(([model, metrics]) => ({
    model,
    value: metrics[metric]
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="model" />
          <YAxis tickFormatter={formatValue} />
          <Tooltip formatter={(value) => formatValue(value)} />
          <Bar dataKey="value" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Modified ResultsBrowser component (read-only version)
const ResultsBrowser = ({ data, onBack }) => {
  const imageIds = Object.keys(data.analyses);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentImageId = imageIds[currentIndex];
  const imageData = data.analyses[currentImageId];
  const models = Object.keys(data.overall_metrics);

  const getStatusColor = (status) => {
    switch (status) {
      case 'correct': return 'bg-green-100';
      case 'incorrect_transcription': return 'bg-orange-100';
      case 'missing': return 'bg-red-100';
      default: return '';
    }
  };

  const goToNext = () => {
    if (currentIndex < imageIds.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const formatFieldValue = (value, listIndex = null) => {
    if (value === null || value === '""' || value === '[]' || value === '') return 'null';
    if (Array.isArray(value)) {
      return (
        <div className="space-y-1">
          {value.map((item, i) => (
            <div key={i} className="pl-2 border-l-2 border-gray-300">
              {typeof item === 'string' ? item.replace(/['"]/g, '') : item}
            </div>
          ))}
        </div>
      );
    }
    
    let result;
    if (typeof value === 'string') {
      const formattedValue = value.replace(/['"]/g, '');
      result = listIndex !== null ? `[${listIndex}] ${formattedValue}` : formattedValue;
    } else {
      result = listIndex !== null ? `[${listIndex}] ${String(value)}` : String(value);
    }
    
    return result;
  };

  // Group fields by parent path for list items
  const groupedFields = imageData.fields.reduce((acc, field) => {
    if (field.is_list_item) {
      if (!acc[field.parent_path]) {
        acc[field.parent_path] = [];
      }
      acc[field.parent_path].push(field);
    } else {
      acc[field.field_path] = [field];
    }
    return acc;
  }, {});

  // Sort list items by index
  Object.keys(groupedFields).forEach(key => {
    if (groupedFields[key].length > 1) {
      groupedFields[key].sort((a, b) => a.list_index - b.list_index);
    }
  });

  return (
    <div className="flex flex-col h-screen">
      <div className="flex justify-between items-center p-6 bg-white border-b">
        <div>
          <h1 className="text-2xl font-bold">Image Analysis</h1>
          <p className="text-gray-600">
            Image {currentIndex + 1} of {imageIds.length}: {currentImageId}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Static View (Read-Only)</span>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            ← Back to Summary
          </button>
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className={`px-4 py-2 text-white rounded ${currentIndex === 0 ? 'bg-gray-300' : 'bg-blue-500 hover:bg-blue-600'}`}
          >
            Previous
          </button>
          <button
            onClick={goToNext}
            disabled={currentIndex === imageIds.length - 1}
            className={`px-4 py-2 text-white rounded ${currentIndex === imageIds.length - 1 ? 'bg-gray-300' : 'bg-blue-500 hover:bg-blue-600'}`}
          >
            Next
          </button>
        </div>
      </div>

      <div className="h-[50vh] flex gap-4 p-6 bg-gray-100">
        <div className="w-1/2 h-full flex items-center justify-center bg-white rounded-lg border">
          <ZoomableImage src={imageData.front_url} alt="Front" />
        </div>
        <div className="w-1/2 h-full flex items-center justify-center bg-white rounded-lg border">
          <ZoomableImage src={imageData.back_url} alt="Back" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48 bg-gray-50">Field</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48 bg-gray-50">Ground Truth</th>
                {models.map(model => (
                  <th key={model} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48 bg-gray-50">
                    {model}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Regular fields (non-list items) */}
              {imageData.fields
                .filter(field => !field.is_list_item && field.field_path !== 'artwork.history.literature' && field.field_path !== 'artwork.history.provenance')
                .map(field => (
                  <tr key={field.field_path} className="bg-white">
                    <td className="px-6 py-4 break-words font-medium">
                      {field.field_path}
                    </td>
                    <td className="px-6 py-4 break-words whitespace-pre-line">
                      {formatFieldValue(field.ground_truth)}
                    </td>
                    {models.map(model => (
                      <td 
                        key={model}
                        className={`px-6 py-4 break-words whitespace-pre-line ${getStatusColor(field.status[model])}`}
                      >
                        {formatFieldValue(field.model_values[model])}
                      </td>
                    ))}
                  </tr>
                ))}
              
              {/* Literature section header */}
              <tr className="bg-blue-200">
                <td colSpan={models.length + 2} className="px-6 py-2 font-bold">
                  Literature
                </td>
              </tr>
              
              {/* Literature list items */}
              {imageData.fields
                .filter(field => field.field_path.startsWith('artwork.history.literature['))
                .sort((a, b) => a.list_index - b.list_index)
                .map(listField => (
                  <tr key={`literature-final-${listField.list_index}`} className="bg-blue-50">
                    <td className="px-6 py-2 pl-10 break-words font-medium text-sm text-gray-600">
                      Literature [{listField.list_index}]
                    </td>
                    <td className="px-6 py-2 break-words whitespace-pre-line">
                      {listField.ground_truth}
                    </td>
                    {models.map(model => (
                      <td 
                        key={model}
                        className={`px-6 py-2 break-words whitespace-pre-line ${getStatusColor(listField.status[model])}`}
                      >
                        {listField.model_values[model]}
                      </td>
                    ))}
                  </tr>
                ))}
              
              {/* Provenance section header */}
              <tr className="bg-green-200">
                <td colSpan={models.length + 2} className="px-6 py-2 font-bold">
                  Provenance
                </td>
              </tr>
              
              {/* Provenance list items */}
              {imageData.fields
                .filter(field => field.field_path.startsWith('artwork.history.provenance['))
                .sort((a, b) => a.list_index - b.list_index)
                .map(listField => (
                  <tr key={`provenance-final-${listField.list_index}`} className="bg-green-50">
                    <td className="px-6 py-2 pl-10 break-words font-medium text-sm text-gray-600">
                      Provenance [{listField.list_index}]
                    </td>
                    <td className="px-6 py-2 break-words whitespace-pre-line">
                      {listField.ground_truth}
                    </td>
                    {models.map(model => (
                      <td 
                        key={model}
                        className={`px-6 py-2 break-words whitespace-pre-line ${getStatusColor(listField.status[model])}`}
                      >
                        {listField.model_values[model]}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Summary = ({ data, onBrowseResults }) => {
  const metrics = data?.overall_metrics;
  if (!metrics) return null;

  const modelCount = Object.keys(metrics).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Model Comparison Summary</h1>
        <button
          onClick={onBrowseResults}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Browse Results →
        </button>
      </div>
      
      <div className="text-sm text-gray-600 mb-4">
        Found {modelCount} models in data
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Accuracy Comparison</h2>
          <ModelComparisonChart 
            data={metrics} 
            metric="accuracy" 
            formatValue={formatPercent}
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Cost Comparison</h2>
          <ModelComparisonChart 
            data={metrics} 
            metric="cost_per_image"
            formatValue={formatCurrency}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Detailed Metrics</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Incorrect Transcription</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Missing</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost/Image</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time/Image</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(metrics).map(([model, m]) => (
                <tr key={model}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{model}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatPercent(m.accuracy)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatPercent(m.incorrect_transcription_rate)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatPercent(m.missing_rate)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(m.cost_per_image)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatTime(m.time_per_image)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [data, setData] = useState(null);
  const [view, setView] = useState('summary');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load data from the static JSON file
    setLoading(true);
    fetch('./data/analysis.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Loaded analysis data:', data);
        setData(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading data:', error);
        setError(error.message);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading data...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Data</h2>
        <p className="text-gray-700 mb-4">{error}</p>
        <p className="text-gray-600 text-sm">
          This is a static version of the application. Make sure the data file is available at the correct location.
        </p>
      </div>
    </div>
  );

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-blue-600 text-white p-2 text-center text-sm">
        Static Version - GitHub Pages - Read Only
      </div>
      {view === 'summary' ? (
        <Summary 
          data={data}
          onBrowseResults={() => setView('results')}
        />
      ) : (
        <ResultsBrowser 
          data={data}
          onBack={() => setView('summary')}
        />
      )}
    </div>
  );
};

export default App;
