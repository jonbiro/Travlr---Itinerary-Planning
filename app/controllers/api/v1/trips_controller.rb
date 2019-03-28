class Api::V1::TripsController < ApplicationController
  before_action :find_trip, only: [:show, :update, :destroy]

  def index
    @trips = current_user.trips

    render json: { result: "success", data: @trips }
  end

  # GET /trips/1
  def show
    render json: @trip
  end

  # POST /trips
  def create
    @trip = Trip.new(trip_params)
    if @trip.save
      @trip_user = TripUser.create(user_id: current_user.id, trip_id: @trip.id)
      render json: { trip: @trip, tripuser: @trip_user }, status: :created
    else
      render json: @trip.errors, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /trips/1
  def update
    if @trip.update(trip_params)
      render json: @trip
    else
      render json: @trip.errors, status: :unprocessable_entity
    end
  end

  # DELETE /trips/1
  def destroy
    @trip.destroy
  end

  #GET /trips and /users
  def group
    @trips = Trip.find(current_user).trip_users

    render json: { result: "success", data: @trips }
  end

  private

  def find_trip
    @trip = Trip.find(params[:id])
  end

  def trip_params
    params.require(:trip).permit(:start_date, :end_date, :name, :img_url, :destination, :city_name)
  end
end
