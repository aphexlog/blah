import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const Reports: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Reports
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            This is the Reports page. Implementation coming soon...
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Reports;
