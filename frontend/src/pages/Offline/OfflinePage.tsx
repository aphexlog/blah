import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const OfflinePage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        OfflinePage
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            This is the OfflinePage page. Implementation coming soon...
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default OfflinePage;
