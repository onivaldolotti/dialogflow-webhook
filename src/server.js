const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

const url = 'https://agenda-service.vercel.app/';

app.use(bodyParser.json());

app.post('/dialogflow-webhook', async (req, res) => {
  try {
    const intent = req.body.queryResult.intent.displayName;
    const parameters = req.body.queryResult.parameters;

    let responseText;

    switch (intent) {
      case 'Finalização Intent':
        const appointmentData = {
          professionalId: parameters.professionalId,
          serviceId: parameters.serviceId,
          appointmentDateTime: parameters.appointmentDateTime,
        };
        const response1 = await axios.post(`${url}scheduling/create-appointment`, appointmentData);

        if (response1.data.message === 'Appointment created successfully.') {
          responseText = 'Agendamento com sucesso.';
        } else {
          responseText = 'Agendamento sem sucesso.';
        }
        break;

      case 'Escolher Dia Intent':
        const availabilityData = {
          professionalId: parameters.professionalId,
          serviceId: parameters.serviceId,
        };
        const response2 = await axios.get(`${url}scheduling/available-dates?`, { params: availabilityData });

        if (Array.isArray(response2.data)) {
          responseText = response2.data.join('\n');
        } else {
          responseText = 'Erro ao obter datas disponíveis.';
        }
        break;

      case 'Escolher Horário Intent':
        const availableTimesData = {
          professionalId: parameters.professionalId,
          serviceId: parameters.serviceId,
          date: parameters.date,
        };
        const response3 = await axios.get(`${url}scheduling/available-times?`, { params: availableTimesData });

        if (Array.isArray(response3.data)) {
          responseText = response3.data.join('\n');
        } else {
          responseText = 'Erro ao obter horários disponíveis.';
        }
        break;

      default:
        responseText = 'Intent desconhecida.';
    }

    const response = {
      fulfillmentText: responseText,
    };

    res.json(response);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ fulfillmentText: 'Ocorreu um erro.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
