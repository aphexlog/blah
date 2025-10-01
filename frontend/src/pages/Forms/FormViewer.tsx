import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const FormViewer: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        FormViewer
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            This is the FormViewer page. Implementation coming soon...
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default FormViewer;
