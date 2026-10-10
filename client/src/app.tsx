import React from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import StockPickerPage from './pages/StockPicker/StockPickerPage';
import StrategyPage from './pages/Strategy/StrategyPage';
import ConfigPage from './pages/Config/ConfigPage';

const RoutesComponent = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<StockPickerPage />} />
        <Route path="picker" element={<StockPickerPage />} />
        <Route path="strategies" element={<StrategyPage />} />
        <Route path="config" element={<ConfigPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
